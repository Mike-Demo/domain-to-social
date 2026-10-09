import { describe, expect, it } from "vitest";
import { matchProfile } from "./platforms";

const m = (u: string) => {
  const r = matchProfile(u);
  return r ? { id: r.platform.id, tag: r.profile.tag } : null;
};

describe("new platforms", () => {
  it("discord invites", () => {
    expect(m("https://discord.gg/abc123")).toEqual({ id: "discord", tag: "abc123" });
    expect(m("https://discord.com/invite/abc123")).toEqual({ id: "discord", tag: "abc123" });
  });
  it("twitch", () => {
    expect(m("https://www.twitch.tv/brand")).toEqual({ id: "twitch", tag: "@brand" });
    expect(m("https://www.twitch.tv/directory")).toBeNull();
  });
  it("substack", () => {
    expect(m("https://brand.substack.com/p/post")).toEqual({ id: "substack", tag: "@brand" });
    expect(m("https://substack.com/@brand")).toEqual({ id: "substack", tag: "@brand" });
    expect(m("https://on.substack.com")).toBeNull();
  });
  it("telegram", () => {
    expect(m("https://t.me/brand")).toEqual({ id: "telegram", tag: "@brand" });
    expect(m("https://t.me/joinchat/xyz")).toBeNull();
    expect(m("https://t.me/+xyz")).toBeNull();
  });
  it("reddit", () => {
    expect(m("https://www.reddit.com/r/brand")).toEqual({ id: "reddit", tag: "r/brand" });
    expect(m("https://www.reddit.com/u/brand")).toEqual({ id: "reddit", tag: "u/brand" });
    expect(m("https://www.reddit.com/r/popular")).toBeNull();
  });
  it("patreon", () => {
    expect(m("https://www.patreon.com/c/brand")).toEqual({ id: "patreon", tag: "@brand" });
    expect(m("https://www.patreon.com/posts/123")).toBeNull();
  });
  it("behance", () => {
    expect(m("https://www.behance.net/brand")).toEqual({ id: "behance", tag: "@brand" });
    expect(m("https://www.behance.net/gallery/1/x")).toBeNull();
  });
  it("dribbble", () => {
    expect(m("https://dribbble.com/brand")).toEqual({ id: "dribbble", tag: "@brand" });
    expect(m("https://dribbble.com/shots/1")).toBeNull();
  });
});
