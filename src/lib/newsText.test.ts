import { describe, expect, test } from "bun:test";
import { decodeHtmlEntities, sanitizeNewsTitle } from "./newsText";

describe("decodeHtmlEntities", () => {
  test("decodes named entities", () => {
    expect(decodeHtmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(decodeHtmlEntities("5 &lt; 10 &gt; 2")).toBe("5 < 10 > 2");
    expect(decodeHtmlEntities('She said &quot;hello&quot;')).toBe('She said "hello"');
    expect(decodeHtmlEntities("It&apos;s mine")).toBe("It's mine");
  });

  test("decodes numeric entities", () => {
    expect(decodeHtmlEntities("Don&#39;t panic")).toBe("Don't panic");
    expect(decodeHtmlEntities("&#x27; quoted &#x27;")).toBe("' quoted '");
    expect(decodeHtmlEntities("&#160;space")).toBe("\u00A0space");
  });

  test("returns empty string for null/undefined", () => {
    expect(decodeHtmlEntities(null)).toBe("");
    expect(decodeHtmlEntities(undefined)).toBe("");
  });
});

describe("sanitizeNewsTitle", () => {
  test("strips HTML tags and decodes entities", () => {
    expect(sanitizeNewsTitle("<b>DVSA</b> update &amp; changes")).toBe(
      "DVSA update & changes",
    );
  });

  test("collapses whitespace and trims", () => {
    expect(
      sanitizeNewsTitle(
        "  DVSA   announces   new  driving  test  rules  ",
      ),
    ).toBe("DVSA announces new driving test rules");
  });

  test("handles realistic messy RSS title", () => {
    const raw =
      "Driving test waiting times: what you need to know&#039; &amp; more";
    expect(sanitizeNewsTitle(raw)).toBe(
      "Driving test waiting times: what you need to know' & more",
    );
  });

  test("returns empty string for null/undefined", () => {
    expect(sanitizeNewsTitle(null)).toBe("");
    expect(sanitizeNewsTitle(undefined)).toBe("");
  });
});
