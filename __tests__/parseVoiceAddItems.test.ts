import { parseVoiceAddItems } from "../lib/voice/parseVoiceAddItems";

describe("parseVoiceAddItems", () => {
  it("parses add commands into multiple item names", () => {
    const parsed = parseVoiceAddItems("add milk and bread, eggs");

    expect(parsed).toEqual([
      { name: "milk" },
      { name: "bread" },
      { name: "eggs" },
    ]);
  });

  it("strips polite prefixes and filler determiners", () => {
    const parsed = parseVoiceAddItems(
      "please can you add the bananas and some yogurt",
    );

    expect(parsed).toEqual([{ name: "bananas" }, { name: "yogurt" }]);
  });

  it("deduplicates repeated items in one transcript", () => {
    const parsed = parseVoiceAddItems("add milk and milk and bread");

    expect(parsed).toEqual([{ name: "milk" }, { name: "bread" }]);
  });

  it("returns empty when transcript is blank", () => {
    const parsed = parseVoiceAddItems("   ");

    expect(parsed).toEqual([]);
  });

  it("treats transcript with no add keyword as raw item names", () => {
    const parsed = parseVoiceAddItems("orange juice");

    expect(parsed).toEqual([{ name: "orange juice" }]);
  });
});
