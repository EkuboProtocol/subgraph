import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import { ExtensionRegistered } from "../generated/schema"
import { ExtensionRegistered as ExtensionRegisteredEvent } from "../generated/Core/Core"
import { handleExtensionRegistered } from "../src/core"
import { createExtensionRegisteredEvent } from "./core-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let extension = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let newExtensionRegisteredEvent = createExtensionRegisteredEvent(extension)
    handleExtensionRegistered(newExtensionRegisteredEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("ExtensionRegistered created and stored", () => {
    assert.entityCount("ExtensionRegistered", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "ExtensionRegistered",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "extension",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
