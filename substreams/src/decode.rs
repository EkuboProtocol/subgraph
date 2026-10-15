use crate::abi;
use crate::addresses::*;
use crate::pb::ekubo::v3::__buffa::oneof::event::Payload;
use crate::pb::ekubo::v3::*;
use buffa::MessageField;
use num_bigint::{BigInt, BigUint};
use tiny_keccak::{Hasher, Keccak};

pub fn decode(
    emitter: &[u8],
    topic0: Option<&[u8]>,
    topics: &[Vec<u8>],
    data: &[u8],
) -> Option<Payload> {
    let Some(topic0) = topic0 else {
        return decode_topicless(emitter, data);
    };
    let words = Words(data);
    let payload = if emitter == CORE {
        decode_core(topic0, words)?
    } else if emitter == TWAMM || emitter == LEGACY_TWAMM {
        decode_twamm(emitter, topic0, words)?
    } else if emitter == BOOSTED_FEES_CONCENTRATED || emitter == BOOSTED_FEES_STABLESWAP {
        if topic0 != abi::POOL_BOOSTED {
            return None;
        }
        Payload::PoolBoosted(Box::new(PoolBoosted {
            pool_id: words.bytes(0),
            start_time: words.u64(1),
            end_time: words.u64(2),
            rate0: words.uint(3),
            rate1: words.uint(4),
            ..Default::default()
        }))
    } else if emitter == AUCTIONS {
        decode_auctions(topic0, topics, words)?
    } else if [
        POSITIONS,
        RECOMPILED_POSITIONS,
        LEGACY_ORDERS,
        ORDERS,
        RECOMPILED_ORDERS,
    ]
    .iter()
    .any(|a| emitter == a)
    {
        decode_transfer(topic0, topics)?
    } else if emitter == INCENTIVES {
        decode_incentives(topic0, words)?
    } else if emitter == TOKEN_WRAPPER_FACTORY {
        if topic0 != abi::TOKEN_WRAPPER_DEPLOYED {
            return None;
        }
        Payload::TokenWrapperDeployed(Box::new(TokenWrapperDeployed {
            underlying_token: words.address(0),
            unlock_time: words.uint(1),
            token_wrapper: words.address(2),
            ..Default::default()
        }))
    } else {
        return None;
    };
    Some(payload)
}

fn decode_topicless(emitter: &[u8], data: &[u8]) -> Option<Payload> {
    if emitter == CORE {
        Some(Payload::Swapped(Box::new(decode_swapped(data))))
    } else if emitter == ORACLE {
        Some(Payload::OracleSnapshot(Box::new(decode_oracle_snapshot(
            data,
        ))))
    } else if emitter == TWAMM || emitter == LEGACY_TWAMM {
        let (pool_id, rate0, rate1) = decode_rates(data);
        Some(Payload::VirtualOrdersExecuted(Box::new(
            VirtualOrdersExecuted {
                pool_id,
                sale_rate_token0: rate0,
                sale_rate_token1: rate1,
                ..Default::default()
            },
        )))
    } else if emitter == BOOSTED_FEES_CONCENTRATED || emitter == BOOSTED_FEES_STABLESWAP {
        let (pool_id, rate0, rate1) = decode_rates(data);
        Some(Payload::FeesDonated(Box::new(FeesDonated {
            pool_id,
            donate_rate0: rate0,
            donate_rate1: rate1,
            ..Default::default()
        })))
    } else {
        None
    }
}

fn require_length(data: &[u8], length: usize, what: &str) {
    assert!(
        data.len() == length,
        "unexpected {what} log data length {} (expected {length})",
        data.len()
    );
}

/// locker (20) | pool id (32) | balance update (32) | pool state after (32)
pub fn decode_swapped(data: &[u8]) -> Swapped {
    require_length(data, 116, "swap");
    let state = PoolState::parse(&data[84..116]);
    Swapped {
        locker: data[0..20].to_vec(),
        pool_id: data[20..52].to_vec(),
        delta0: int(&data[52..68]),
        delta1: int(&data[68..84]),
        liquidity_after: state.liquidity,
        sqrt_ratio_after: state.sqrt_ratio,
        tick_after: state.tick,
        ..Default::default()
    }
}

/// token (20) | tick cumulative (8) | seconds per liquidity cumulative (20) | timestamp (4)
pub fn decode_oracle_snapshot(data: &[u8]) -> OracleSnapshot {
    require_length(data, 52, "oracle snapshot");
    OracleSnapshot {
        token: data[0..20].to_vec(),
        tick_cumulative: i64::from_be_bytes(data[20..28].try_into().unwrap()),
        seconds_per_liquidity_cumulative: uint(&data[28..48]),
        timestamp: u32::from_be_bytes(data[48..52].try_into().unwrap()) as u64,
        ..Default::default()
    }
}

/// pool id (32) | rate of token0 (14) | rate of token1 (14)
fn decode_rates(data: &[u8]) -> (Vec<u8>, String, String) {
    require_length(data, 60, "rate");
    (
        data[0..32].to_vec(),
        uint(&data[32..46]),
        uint(&data[46..60]),
    )
}

fn decode_core(topic0: &[u8], words: Words) -> Option<Payload> {
    let payload = if topic0 == abi::POOL_INITIALIZED {
        let config = words.word(3);
        Payload::PoolInitialized(Box::new(PoolInitialized {
            pool_id: words.bytes(0),
            pool_key: MessageField::some(pool_key(words.address(1), words.address(2), config)),
            tick: words.i32(4),
            sqrt_ratio: float_sqrt_ratio_to_fixed(&words.word(5)[20..32]),
            ..Default::default()
        }))
    } else if topic0 == abi::POSITION_UPDATED {
        let position = PositionId::parse(words.word(2));
        let balance_update = words.word(4);
        let state = PoolState::parse(words.word(5));
        Payload::PositionUpdated(Box::new(PositionUpdated {
            locker: words.address(0),
            pool_id: words.bytes(1),
            position_id: words.bytes(2),
            salt: position.salt,
            lower_tick: position.lower,
            upper_tick: position.upper,
            liquidity_delta: words.int(3),
            delta0: int(&balance_update[0..16]),
            delta1: int(&balance_update[16..32]),
            liquidity_after: state.liquidity,
            sqrt_ratio_after: state.sqrt_ratio,
            tick_after: state.tick,
            ..Default::default()
        }))
    } else if topic0 == abi::POSITION_FEES_COLLECTED {
        let position = PositionId::parse(words.word(2));
        Payload::PositionFeesCollected(Box::new(PositionFeesCollected {
            locker: words.address(0),
            pool_id: words.bytes(1),
            position_id: words.bytes(2),
            salt: position.salt,
            lower_tick: position.lower,
            upper_tick: position.upper,
            amount0: words.uint(3),
            amount1: words.uint(4),
            ..Default::default()
        }))
    } else if topic0 == abi::FEES_ACCUMULATED {
        Payload::FeesAccumulated(Box::new(FeesAccumulated {
            pool_id: words.bytes(0),
            amount0: words.uint(1),
            amount1: words.uint(2),
            ..Default::default()
        }))
    } else if topic0 == abi::EXTENSION_REGISTERED {
        Payload::ExtensionRegistered(Box::new(ExtensionRegistered {
            extension: words.address(0),
            ..Default::default()
        }))
    } else {
        return None;
    };
    Some(payload)
}

/// Pool config: extension (20) | fee (8) | type config (4)
fn pool_key(token0: Vec<u8>, token1: Vec<u8>, config: &[u8]) -> PoolKey {
    let type_config = u32::from_be_bytes(config[28..32].try_into().unwrap());
    let mut key = PoolKey {
        token0,
        token1,
        config: config.to_vec(),
        extension: config[0..20].to_vec(),
        fee: u64::from_be_bytes(config[20..28].try_into().unwrap()),
        ..Default::default()
    };
    if type_config & 0x8000_0000 != 0 {
        key.tick_spacing = Some(type_config & 0x7fff_ffff);
    } else {
        key.stableswap_amplification = Some((type_config >> 24) & 0x7f);
        // Sign-extend the low 24 bits.
        let center = ((type_config << 8) as i32) >> 8;
        key.stableswap_center_tick = Some(center * 16);
    }
    key
}

fn decode_twamm(emitter: &[u8], topic0: &[u8], words: Words) -> Option<Payload> {
    let is_update = topic0 == abi::ORDER_UPDATED;
    if !is_update && topic0 != abi::ORDER_PROCEEDS_WITHDRAWN {
        return None;
    }
    let order_key = order_key(words.address(2), words.address(3), words.word(4), emitter);
    let payload = if is_update {
        Payload::OrderUpdated(Box::new(OrderUpdated {
            owner: words.address(0),
            salt: words.bytes(1),
            order_key: MessageField::some(order_key),
            sale_rate_delta: words.int(5),
            ..Default::default()
        }))
    } else {
        Payload::OrderProceedsWithdrawn(Box::new(OrderProceedsWithdrawn {
            owner: words.address(0),
            salt: words.bytes(1),
            order_key: MessageField::some(order_key),
            amount: words.uint(5),
            ..Default::default()
        }))
    };
    Some(payload)
}

/// Order config: fee (8) | is token1 (1) | salt (7) | start time (8) | end time (8)
fn order_key(token0: Vec<u8>, token1: Vec<u8>, config: &[u8], twamm: &[u8]) -> OrderKey {
    let is_selling_token1 = config[8] != 0;
    let (sell_token, buy_token) = if is_selling_token1 {
        (token1.clone(), token0.clone())
    } else {
        (token0.clone(), token1.clone())
    };
    // The order trades in the pool of this TWAMM with the order's fee and a
    // full range type config of zero.
    let mut pool_config = [0u8; 32];
    pool_config[0..20].copy_from_slice(twamm);
    pool_config[20..28].copy_from_slice(&config[0..8]);
    let pool_id = pool_id(&token0, &token1, &pool_config);
    OrderKey {
        fee: u64::from_be_bytes(config[0..8].try_into().unwrap()),
        is_selling_token1,
        sell_token,
        buy_token,
        start_time: u64::from_be_bytes(config[16..24].try_into().unwrap()),
        end_time: u64::from_be_bytes(config[24..32].try_into().unwrap()),
        pool_id,
        token0,
        token1,
        config: config.to_vec(),
        ..Default::default()
    }
}

/// keccak256(abi.encode(token0, token1, config))
pub fn pool_id(token0: &[u8], token1: &[u8], config: &[u8; 32]) -> Vec<u8> {
    let mut encoded = [0u8; 96];
    encoded[12..32].copy_from_slice(token0);
    encoded[44..64].copy_from_slice(token1);
    encoded[64..96].copy_from_slice(config);
    let mut hasher = Keccak::v256();
    hasher.update(&encoded);
    let mut out = [0u8; 32];
    hasher.finalize(&mut out);
    out.to_vec()
}

fn decode_transfer(topic0: &[u8], topics: &[Vec<u8>]) -> Option<Payload> {
    if topic0 != abi::TRANSFER || topics.len() != 4 {
        return None;
    }
    Some(Payload::NonfungibleTokenTransfer(Box::new(
        NonfungibleTokenTransfer {
            from: topics[1][12..32].to_vec(),
            to: topics[2][12..32].to_vec(),
            token_id: uint(&topics[3]),
            ..Default::default()
        },
    )))
}

fn decode_auctions(topic0: &[u8], topics: &[Vec<u8>], words: Words) -> Option<Payload> {
    let auction_key = |first: usize| {
        MessageField::some(AuctionKey {
            token0: words.address(first),
            token1: words.address(first + 1),
            config: words.bytes(first + 2),
            ..Default::default()
        })
    };
    let payload = if topic0 == abi::TRANSFER {
        return decode_transfer(topic0, topics);
    } else if topic0 == abi::AUCTION_COMPLETED {
        Payload::AuctionCompleted(Box::new(AuctionCompleted {
            token_id: words.uint(0),
            auction_key: auction_key(1),
            creator_amount: words.uint(4),
            boost_amount: words.uint(5),
            ..Default::default()
        }))
    } else if topic0 == abi::AUCTION_FUNDS_ADDED {
        Payload::AuctionFundsAdded(Box::new(AuctionFundsAdded {
            token_id: words.uint(0),
            auction_key: auction_key(1),
            sale_rate: words.uint(4),
            ..Default::default()
        }))
    } else if topic0 == abi::BOOST_STARTED {
        Payload::AuctionBoostStarted(Box::new(AuctionBoostStarted {
            auction_key: auction_key(0),
            boost_rate: words.uint(3),
            boost_end_time: words.u64(4),
            ..Default::default()
        }))
    } else if topic0 == abi::CREATOR_PROCEEDS_COLLECTED {
        Payload::CreatorProceedsCollected(Box::new(CreatorProceedsCollected {
            token_id: words.uint(0),
            auction_key: auction_key(1),
            recipient: words.address(4),
            amount: words.uint(5),
            ..Default::default()
        }))
    } else {
        return None;
    };
    Some(payload)
}

fn decode_incentives(topic0: &[u8], words: Words) -> Option<Payload> {
    let payload = if topic0 == abi::FUNDED {
        Payload::IncentivesFunded(Box::new(IncentivesFunded {
            owner: words.address(0),
            token: words.address(1),
            root: words.bytes(2),
            amount_next: words.uint(3),
            ..Default::default()
        }))
    } else if topic0 == abi::REFUNDED {
        Payload::IncentivesRefunded(Box::new(IncentivesRefunded {
            owner: words.address(0),
            token: words.address(1),
            root: words.bytes(2),
            refund_amount: words.uint(3),
            ..Default::default()
        }))
    } else {
        return None;
    };
    Some(payload)
}

/// Pool state: sqrt ratio (12) | tick (4) | liquidity (16)
struct PoolState {
    sqrt_ratio: String,
    tick: i32,
    liquidity: String,
}

impl PoolState {
    fn parse(state: &[u8]) -> Self {
        PoolState {
            sqrt_ratio: float_sqrt_ratio_to_fixed(&state[0..12]),
            tick: i32::from_be_bytes(state[12..16].try_into().unwrap()),
            liquidity: uint(&state[16..32]),
        }
    }
}

/// Position id: salt (24) | lower tick (4) | upper tick (4)
struct PositionId {
    salt: String,
    lower: i32,
    upper: i32,
}

impl PositionId {
    fn parse(id: &[u8]) -> Self {
        PositionId {
            salt: uint(&id[0..24]),
            lower: i32::from_be_bytes(id[24..28].try_into().unwrap()),
            upper: i32::from_be_bytes(id[28..32].try_into().unwrap()),
        }
    }
}

/// The Core packs a square root price into 96 bits: 2 exponent bits and a 94
/// bit mantissa. The fixed point 64.128 value is the mantissa shifted left by
/// 2 + 32 * exponent.
pub fn float_sqrt_ratio_to_fixed(compact: &[u8]) -> String {
    let mut word = [0u8; 16];
    word[16 - compact.len()..].copy_from_slice(compact);
    let value = u128::from_be_bytes(word);
    let exponent = (value >> 94) as usize;
    let mantissa = value & ((1u128 << 94) - 1);
    (BigUint::from(mantissa) << (2 + 32 * exponent)).to_string()
}

fn uint(bytes: &[u8]) -> String {
    BigUint::from_bytes_be(bytes).to_string()
}

fn int(bytes: &[u8]) -> String {
    BigInt::from_signed_bytes_be(bytes).to_string()
}

/// The 32-byte words of ABI-encoded data with only static types.
#[derive(Clone, Copy)]
struct Words<'a>(&'a [u8]);

impl<'a> Words<'a> {
    fn word(&self, i: usize) -> &'a [u8] {
        self.0
            .get(i * 32..(i + 1) * 32)
            .unwrap_or_else(|| panic!("event data has no word {i}"))
    }

    fn bytes(&self, i: usize) -> Vec<u8> {
        self.word(i).to_vec()
    }

    fn address(&self, i: usize) -> Vec<u8> {
        self.word(i)[12..32].to_vec()
    }

    fn uint(&self, i: usize) -> String {
        uint(self.word(i))
    }

    fn int(&self, i: usize) -> String {
        int(self.word(i))
    }

    fn u64(&self, i: usize) -> u64 {
        u64::from_be_bytes(self.word(i)[24..32].try_into().unwrap())
    }

    fn i32(&self, i: usize) -> i32 {
        i32::from_be_bytes(self.word(i)[28..32].try_into().unwrap())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use hex_literal::hex;

    // Logs emitted on Ethereum mainnet. Expected values were computed with the
    // parsers of the Ekubo indexer from the same data.

    #[test]
    fn swap() {
        let s = decode_swapped(&hex!("666fedd4cdd4e890a5ad20e7b60975409435a64a3318f31231b9e65a8e0bd41c42cc1b6982cc0bca516024f9c1a5af8bceb15101fffffffffffffffffffffffff930591f000000000000000631c858df4875b6d78003d0816188991bd3aa979801a59d45000000000000000a753627721d8ec859"));
        assert_eq!(s.locker, hex!("666fedd4cdd4e890a5ad20e7b60975409435a64a"));
        assert_eq!(
            s.pool_id,
            hex!("3318f31231b9e65a8e0bd41c42cc1b6982cc0bca516024f9c1a5af8bceb15101")
        );
        assert_eq!(s.delta0, "-114271969");
        assert_eq!(s.delta1, "114267679261474535127");
        assert_eq!(s.liquidity_after, "192913422259351111769");
        assert_eq!(
            s.sqrt_ratio_after,
            "340262468556416716095139455930203441398284288"
        );
        assert_eq!(s.tick_after, 27630917);
    }

    #[test]
    fn oracle_snapshot() {
        let o = decode_oracle_snapshot(&hex!("a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48fffe4aa2f17f274c00000000000000a0c365ae9152028a95698af3fb6ad0ff3f"));
        assert_eq!(o.token, hex!("a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"));
        assert_eq!(o.timestamp, 1792081727);
        assert_eq!(
            o.seconds_per_liquidity_cumulative,
            "12736978505077692728956550837243"
        );
        assert_eq!(o.tick_cumulative, -480886256621748);
    }

    #[test]
    fn virtual_orders_executed() {
        let Some(Payload::VirtualOrdersExecuted(v)) = decode(&TWAMM, None, &[], &hex!("edeaae143f233a3a5d4fabd3166afa0e2108fe7741489237274b939ca17fcff800000000003faeeb51ea7361a0230000000000000000000000000000")) else {
            panic!();
        };
        assert_eq!(
            v.pool_id,
            hex!("edeaae143f233a3a5d4fabd3166afa0e2108fe7741489237274b939ca17fcff8")
        );
        assert_eq!(v.sale_rate_token0, "1174749134693228191779");
        assert_eq!(v.sale_rate_token1, "0");
    }

    #[test]
    fn order_updated_pool_id_matches_the_indexer() {
        let data = hex!("0000000000000000000000003325428adb409c239e88ca472f50b0efe00e98b49920fcc31c0d28599bbe55903e8e0e9effc164783715be377e83f10b6aa56d87000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004c46e830bb56ce22735d5d8fc9cb90309317d0f00c49ba5e353f7ce00000000000000000000000000000000000000006ad5000000000000000000000000000000000000000000000000003faeeb51ea7361a023");
        let Some(Payload::OrderUpdated(o)) = decode(&TWAMM, Some(&abi::ORDER_UPDATED), &[], &data)
        else {
            panic!();
        };
        let key = o.order_key.as_option().unwrap();
        assert_eq!(o.owner, hex!("3325428adb409c239e88ca472f50b0efe00e98b4"));
        assert_eq!(key.fee, 55340232221128654);
        assert!(!key.is_selling_token1);
        assert_eq!(key.end_time, 1792344064);
        assert_eq!(
            key.pool_id,
            hex!("edeaae143f233a3a5d4fabd3166afa0e2108fe7741489237274b939ca17fcff8")
        );
        assert_eq!(o.sale_rate_delta, "1174749134693228191779");
    }

    #[test]
    fn pool_key_types() {
        let mut config = [0u8; 32];
        config[0..20].copy_from_slice(&[0x10; 20]);
        config[20..28].copy_from_slice(&3000u64.to_be_bytes());
        config[28..32].copy_from_slice(&hex!("8000003c"));
        let concentrated = pool_key(vec![], vec![], &config);
        assert_eq!(concentrated.tick_spacing, Some(60));
        assert_eq!(concentrated.fee, 3000);
        assert_eq!(concentrated.config, config);

        config[28..32].copy_from_slice(&hex!("0cfffffe"));
        let stableswap = pool_key(vec![], vec![], &config);
        assert_eq!(stableswap.tick_spacing, None);
        assert_eq!(stableswap.stableswap_amplification, Some(12));
        assert_eq!(stableswap.stableswap_center_tick, Some(-32));
    }

    #[test]
    fn sqrt_ratio_exponents() {
        assert_eq!(
            float_sqrt_ratio_to_fixed(&hex!("00000000000000000001e240")),
            "493824"
        );
        let mut top = [0u8; 12];
        top[0] = 0xc0;
        top[11] = 5;
        assert_eq!(
            float_sqrt_ratio_to_fixed(&top),
            "1584563250285286751870879006720"
        );
    }

    #[test]
    fn ignores_other_contracts_and_events() {
        assert!(decode(&[1u8; 20], None, &[], &[0u8; 116]).is_none());
        assert!(decode(&CORE, Some(&abi::TRANSFER), &[], &[]).is_none());
    }
}
