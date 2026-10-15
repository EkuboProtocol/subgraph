//! Topic 0 of every event with topics. `tests::topics_match_signatures` checks
//! each against the keccak hash of its signature.

use hex_literal::hex;

pub const POOL_INITIALIZED: [u8; 32] =
    hex!("5e4688b340694b7c7fd30047fd082117dc46e32acfbf81a44bb1fac0ae65154d");
pub const POSITION_UPDATED: [u8; 32] =
    hex!("704b3ab4a76158ad4d66625a2a43be81edbffd24630e8fde5174e97035370a07");
pub const POSITION_FEES_COLLECTED: [u8; 32] =
    hex!("d76ec32fbc3f07c70828b4f94343ee73279d0e8d4d2f28b018a4e67f37497753");
pub const FEES_ACCUMULATED: [u8; 32] =
    hex!("f7e050d866774820d81a86ca676f3afe7bc72603ee893f82e99c08fbde39af6c");
pub const EXTENSION_REGISTERED: [u8; 32] =
    hex!("ec1256266e470abb868620c851f6bde2a3ff602549dcad318ab9ccfcb2977f14");
pub const ORDER_UPDATED: [u8; 32] =
    hex!("8c8c473f31171bbd0f7702c5c4b1f7167c5f452722221d077b38fcf066624083");
pub const ORDER_PROCEEDS_WITHDRAWN: [u8; 32] =
    hex!("31d26f11bb53cdacb84bf1c4daef5696f62c14d2eb3e05ec5679d62b24097b8e");
pub const POOL_BOOSTED: [u8; 32] =
    hex!("2e7673084df1be3c83415d000644819451eb77966bda2a98c67d31dee56ebe66");
pub const TRANSFER: [u8; 32] =
    hex!("ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");
pub const AUCTION_COMPLETED: [u8; 32] =
    hex!("2d50ec660e39ff48690ec5ef501c1df8110c6d30b38adfec2995a319358a130d");
pub const AUCTION_FUNDS_ADDED: [u8; 32] =
    hex!("5e903e9ddb719f1714bc8780c5156eec7492104d2dde2aa280310d4f7e8d0ce8");
pub const BOOST_STARTED: [u8; 32] =
    hex!("9e7c14ac24847369f48b68eb1f9f041ebe1f648093f9392c8991f929025d211b");
pub const CREATOR_PROCEEDS_COLLECTED: [u8; 32] =
    hex!("b75a46bbbb7e0009c4fdbf46dda025b371c337f652d7d0df1c4e7ceb437c07a9");
pub const FUNDED: [u8; 32] =
    hex!("15cbc3785d6c225df42bdfaec854f81d0afcccdcefaeabef19179ed59d52f3d5");
pub const REFUNDED: [u8; 32] =
    hex!("d6206cb67c5fd50198d5d210338167aed7b5ec0c9ada8ca37adb3f74ea03395d");
pub const TOKEN_WRAPPER_DEPLOYED: [u8; 32] =
    hex!("d156160e7e47c8bdc4102917387c735d32cac065a445a0389a8952835f77478c");

#[cfg(test)]
mod tests {
    use super::*;
    use tiny_keccak::{Hasher, Keccak};

    fn keccak(signature: &str) -> [u8; 32] {
        let mut hasher = Keccak::v256();
        hasher.update(signature.as_bytes());
        let mut out = [0u8; 32];
        hasher.finalize(&mut out);
        out
    }

    #[test]
    fn topics_match_signatures() {
        let cases: [(&str, [u8; 32]); 16] = [
            (
                "PoolInitialized(bytes32,(address,address,bytes32),int32,uint96)",
                POOL_INITIALIZED,
            ),
            (
                "PositionUpdated(address,bytes32,bytes32,int128,bytes32,bytes32)",
                POSITION_UPDATED,
            ),
            (
                "PositionFeesCollected(address,bytes32,bytes32,uint128,uint128)",
                POSITION_FEES_COLLECTED,
            ),
            ("FeesAccumulated(bytes32,uint128,uint128)", FEES_ACCUMULATED),
            ("ExtensionRegistered(address)", EXTENSION_REGISTERED),
            (
                "OrderUpdated(address,bytes32,(address,address,bytes32),int112)",
                ORDER_UPDATED,
            ),
            (
                "OrderProceedsWithdrawn(address,bytes32,(address,address,bytes32),uint128)",
                ORDER_PROCEEDS_WITHDRAWN,
            ),
            (
                "PoolBoosted(bytes32,uint64,uint64,uint112,uint112)",
                POOL_BOOSTED,
            ),
            ("Transfer(address,address,uint256)", TRANSFER),
            (
                "AuctionCompleted(uint256,(address,address,bytes32),uint128,uint128)",
                AUCTION_COMPLETED,
            ),
            (
                "AuctionFundsAdded(uint256,(address,address,bytes32),uint112)",
                AUCTION_FUNDS_ADDED,
            ),
            (
                "BoostStarted((address,address,bytes32),uint112,uint64)",
                BOOST_STARTED,
            ),
            (
                "CreatorProceedsCollected(uint256,(address,address,bytes32),address,uint128)",
                CREATOR_PROCEEDS_COLLECTED,
            ),
            ("Funded((address,address,bytes32),uint128)", FUNDED),
            ("Refunded((address,address,bytes32),uint128)", REFUNDED),
            (
                "TokenWrapperDeployed(address,uint256,address)",
                TOKEN_WRAPPER_DEPLOYED,
            ),
        ];
        for (signature, topic) in cases {
            assert_eq!(keccak(signature), topic, "{signature}");
        }
    }
}
