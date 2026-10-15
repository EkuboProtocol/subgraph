import {
  afterEach,
  assert,
  clearStore,
  describe,
  test,
} from "matchstick-as/assembly/index";
import {
  OrderProceedsWithdrawn as OrderProceedsWithdrawnEvent,
  OrderUpdated as OrderUpdatedEvent,
} from "../generated/TWAMM/TWAMM";
import { handleOrderProceedsWithdrawn, handleOrderUpdated } from "../src/twamm";
import { eventFromData, eventId } from "./utils";

const TWAMM = "0xd47f1b1edcfeabb08f6ebd8fc337c27e636c75ba";
const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const NATIVE = "0x0000000000000000000000000000000000000000";
const TOKEN = "0x04c46e830bb56ce22735d5d8fc9cb90309317d0f";

// Both logs were emitted on Ethereum mainnet in transaction
// 0xd9c547dab457b45c9ae162a9c29a2051117806d2994e299d3c5e1e861f09302c. Pool ids
// were computed with toPoolId and toPoolConfigV2 of the Ekubo indexer.

describe("TWAMM", () => {
  afterEach(() => {
    clearStore();
  });

  test("decodes OrderUpdated like the indexer", () => {
    handleOrderUpdated(
      changetype<OrderUpdatedEvent>(
        eventFromData(
          TWAMM,
          "(address,bytes32,(address,address,bytes32),int112)",
          ["owner", "salt", "orderKey", "saleRateDelta"],
          "0x0000000000000000000000003325428adb409c239e88ca472f50b0efe00e98b49920fcc31c0d28599bbe55903e8e0e9effc164783715be377e83f10b6aa56d87000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004c46e830bb56ce22735d5d8fc9cb90309317d0f00c49ba5e353f7ce00000000000000000000000000000000000000006ad5000000000000000000000000000000000000000000000000003faeeb51ea7361a023",
          19,
        ),
      ),
    );

    const id = eventId(19);
    assert.fieldEquals(
      "TwammOrderUpdate",
      id,
      "owner",
      "0x3325428adb409c239e88ca472f50b0efe00e98b4",
    );
    assert.fieldEquals(
      "TwammOrderUpdate",
      id,
      "salt",
      "0x9920fcc31c0d28599bbe55903e8e0e9effc164783715be377e83f10b6aa56d87",
    );
    assert.fieldEquals("TwammOrderUpdate", id, "token0", NATIVE);
    assert.fieldEquals("TwammOrderUpdate", id, "token1", TOKEN);
    assert.fieldEquals("TwammOrderUpdate", id, "fee", "55340232221128654");
    assert.fieldEquals("TwammOrderUpdate", id, "isSellingToken1", "false");
    assert.fieldEquals("TwammOrderUpdate", id, "sellToken", NATIVE);
    assert.fieldEquals("TwammOrderUpdate", id, "buyToken", TOKEN);
    assert.fieldEquals("TwammOrderUpdate", id, "startTime", "0");
    assert.fieldEquals("TwammOrderUpdate", id, "endTime", "1792344064");
    assert.fieldEquals(
      "TwammOrderUpdate",
      id,
      "saleRateDelta",
      "1174749134693228191779",
    );
    // The same pool id, with this sale rate, appears in a later virtual order
    // execution log of this TWAMM (see tests/receipt.test.ts).
    assert.fieldEquals(
      "TwammOrderUpdate",
      id,
      "poolId",
      "0xedeaae143f233a3a5d4fabd3166afa0e2108fe7741489237274b939ca17fcff8",
    );
  });

  test("decodes OrderProceedsWithdrawn like the indexer", () => {
    handleOrderProceedsWithdrawn(
      changetype<OrderProceedsWithdrawnEvent>(
        eventFromData(
          TWAMM,
          "(address,bytes32,(address,address,bytes32),uint128)",
          ["owner", "salt", "orderKey", "amount"],
          "0x0000000000000000000000003325428adb409c239e88ca472f50b0efe00e98b49920fcc31c0d28599bbe55903e8e0e9effc164783715be377e83f10b6aa56d8700000000000000000000000004c46e830bb56ce22735d5d8fc9cb90309317d0f000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700c49ba5e353f7ce01000000000000000000000000000000000000006acb000000000000000000000000000000000000000000000000000146b89d617363b8fa",
          9,
        ),
      ),
    );

    const id = eventId(9);
    assert.fieldEquals("TwammOrderProceedsWithdrawal", id, "token0", TOKEN);
    assert.fieldEquals("TwammOrderProceedsWithdrawal", id, "token1", USDT);
    assert.fieldEquals(
      "TwammOrderProceedsWithdrawal",
      id,
      "isSellingToken1",
      "true",
    );
    assert.fieldEquals("TwammOrderProceedsWithdrawal", id, "sellToken", USDT);
    assert.fieldEquals("TwammOrderProceedsWithdrawal", id, "buyToken", TOKEN);
    assert.fieldEquals(
      "TwammOrderProceedsWithdrawal",
      id,
      "endTime",
      "1791688704",
    );
    assert.fieldEquals(
      "TwammOrderProceedsWithdrawal",
      id,
      "amount",
      "23542740093952571642",
    );
    assert.fieldEquals(
      "TwammOrderProceedsWithdrawal",
      id,
      "poolId",
      "0x1aaf75dd5f245ecab22d5ef640cfebd553e84e61d097b303fb0bc0ded1b46789",
    );
  });
});
