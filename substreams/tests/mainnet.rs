//! Replays every log the Ekubo v3 contracts emitted on Ethereum in blocks
//! 26198900 to 26199108, as returned by eth_getLogs, through `map_events`.
//!
//! The expected counts are the number of logs per event in that range, counted
//! independently on Dune. Unlike the subgraph, which reaches logs without topics
//! only through transaction receipts and misses the one transaction in this
//! range with nothing to anchor on, every log is decoded.

use std::collections::{BTreeMap, HashMap};

use ekubo_v3_substreams::events_of_block;
use ekubo_v3_substreams::pb::ekubo::v3::__buffa::oneof::event::Payload;
use serde::Deserialize;
use substreams_ethereum::pb::eth::v2::{
    Block, Log, TransactionReceipt, TransactionTrace, TransactionTraceStatus,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RpcLog {
    block_number: u64,
    transaction_hash: String,
    transaction_index: u32,
    log_index: u32,
    address: String,
    topics: Vec<String>,
    data: String,
}

fn bytes(hex: &str) -> Vec<u8> {
    hex::decode(hex.trim_start_matches("0x")).unwrap()
}

fn blocks() -> Vec<Block> {
    let logs: Vec<RpcLog> =
        serde_json::from_str(include_str!("fixtures/mainnet-26198900-26199108.json")).unwrap();

    let mut by_block: BTreeMap<u64, BTreeMap<u32, (String, Vec<RpcLog>)>> = BTreeMap::new();
    for log in logs {
        by_block
            .entry(log.block_number)
            .or_default()
            .entry(log.transaction_index)
            .or_insert_with(|| (log.transaction_hash.clone(), Vec::new()))
            .1
            .push(log);
    }

    by_block
        .into_iter()
        .map(|(number, transactions)| Block {
            number,
            transaction_traces: transactions
                .into_iter()
                .map(|(index, (hash, logs))| TransactionTrace {
                    hash: bytes(&hash),
                    index,
                    status: TransactionTraceStatus::Succeeded.into(),
                    receipt: buffa::MessageField::some(TransactionReceipt {
                        logs: logs
                            .iter()
                            .map(|l| Log {
                                address: bytes(&l.address),
                                topics: l.topics.iter().map(|t| bytes(t)).collect(),
                                data: bytes(&l.data),
                                block_index: l.log_index,
                                ..Default::default()
                            })
                            .collect(),
                        ..Default::default()
                    }),
                    ..Default::default()
                })
                .collect(),
            ..Default::default()
        })
        .collect()
}

fn kind(payload: &Payload) -> &'static str {
    match payload {
        Payload::Swapped(_) => "swapped",
        Payload::OracleSnapshot(_) => "oracle_snapshot",
        Payload::VirtualOrdersExecuted(_) => "virtual_orders_executed",
        Payload::FeesDonated(_) => "fees_donated",
        Payload::PositionUpdated(_) => "position_updated",
        Payload::PositionFeesCollected(_) => "position_fees_collected",
        Payload::FeesAccumulated(_) => "fees_accumulated",
        _ => "other",
    }
}

#[test]
fn decodes_every_log_in_range() {
    let mut counts: HashMap<&str, usize> = HashMap::new();
    let mut last = (0u64, 0u32);
    for block in blocks() {
        for event in events_of_block(&block).events {
            let position = (event.block_number, event.log_index);
            assert!(position > last, "events out of order at {position:?}");
            last = position;
            *counts
                .entry(kind(event.payload.as_ref().unwrap()))
                .or_default() += 1;
        }
    }

    let expected = [
        ("swapped", 179),
        ("oracle_snapshot", 30),
        ("virtual_orders_executed", 12),
        ("fees_donated", 5),
        ("position_updated", 2),
        ("position_fees_collected", 1),
        ("fees_accumulated", 5),
        ("other", 0),
    ];
    for (name, count) in expected {
        assert_eq!(counts.get(name).copied().unwrap_or(0), count, "{name}");
    }
}

#[test]
fn includes_the_transaction_the_subgraph_cannot_reach() {
    let hash = bytes("0x2d9e5e97ed28a7ab95327fba7551814a800775f41ef08258b820eaad44ee1c2f");
    let log_indexes: Vec<u32> = blocks()
        .iter()
        .flat_map(|b| events_of_block(b).events)
        .filter(|e| e.transaction_hash == hash)
        .map(|e| e.log_index)
        .collect();
    assert_eq!(log_indexes, vec![363, 364, 365, 366, 367, 368]);
}

#[test]
fn decodes_position_updated_like_the_indexer() {
    let event = blocks()
        .iter()
        .flat_map(|b| events_of_block(b).events)
        .find(|e| e.block_number == 26198905 && e.log_index == 368)
        .unwrap();
    let Some(Payload::PositionUpdated(p)) = event.payload else {
        panic!("not a position update");
    };
    assert_eq!(
        hex::encode(&p.locker),
        "8e0a8e0cf1cde9845d426678e6139194fb442e6e"
    );
    assert_eq!(
        p.salt,
        "3430530284004775188888215212345911956170291379026572172247"
    );
    assert_eq!((p.lower_tick, p.upper_tick), (1200, 1300));
    assert_eq!(p.liquidity_delta, "-27730000620276");
    assert_eq!((p.delta0.as_str(), p.delta1.as_str()), ("-1385633046", "0"));
    assert_eq!(p.liquidity_after, "57620824221760");
    assert_eq!(p.tick_after, 902);
    assert_eq!(
        p.sqrt_ratio_after,
        "340436015579406491264959269579299749888"
    );
    assert_eq!(event.transaction_index, 199);
}
