//! Decodes every log of the Ekubo v3 contracts, including the logs without
//! topics that subgraphs cannot see: swaps, oracle snapshots, TWAMM virtual
//! order executions and BoostedFees donations.

pub mod abi;
pub mod addresses;
mod decode;

pub mod pb {
    include!(concat!(env!("OUT_DIR"), "/pb.rs"));
}

use pb::ekubo::v3::__buffa::oneof::event::Payload;
use pb::ekubo::v3::{Event, Events};
use substreams::errors::Error;
use substreams_ethereum::pb::eth::v2::{Block, Log, TransactionTrace};

#[substreams::handlers::map]
fn map_events(block: Block) -> Result<Events, Error> {
    Ok(events_of_block(&block))
}

pub fn events_of_block(block: &Block) -> Events {
    let header = block.header.as_option();
    let block_timestamp = header
        .and_then(|h| h.timestamp.as_option())
        .map(|t| t.seconds as u64)
        .unwrap_or_default();

    let mut events = Vec::new();
    for transaction in block.transactions() {
        let Some(receipt) = transaction.receipt.as_option() else {
            continue;
        };
        for log in receipt.logs.iter() {
            if let Some(payload) = decode_log(log) {
                events.push(event(block, block_timestamp, transaction, log, payload));
            }
        }
    }

    Events {
        events,
        ..Default::default()
    }
}

fn event(
    block: &Block,
    block_timestamp: u64,
    transaction: &TransactionTrace,
    log: &Log,
    payload: Payload,
) -> Event {
    Event {
        block_number: block.number,
        block_hash: block.hash.clone(),
        block_timestamp,
        transaction_hash: transaction.hash.clone(),
        transaction_index: transaction.index,
        transaction_from: transaction.from.clone(),
        log_index: log.block_index,
        emitter: log.address.clone(),
        payload: Some(payload),
        ..Default::default()
    }
}

/// Decodes a log if an Ekubo v3 contract emitted it.
pub fn decode_log(log: &Log) -> Option<Payload> {
    let emitter: &[u8] = &log.address;
    let topic0 = log.topics.first().map(|t| t.as_slice());
    decode::decode(emitter, topic0, &log.topics, &log.data)
}
