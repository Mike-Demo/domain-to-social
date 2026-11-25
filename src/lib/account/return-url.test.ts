import {expect,test} from "vitest";
import {trustedAppOrigin as t} from "./return-url";
const id="831c3fbb-ecd3-4cce-aa6f-d171c291f992";
test("x",()=>{expect(t(`attacker${id}.lovable.app`)).toBe("https://magicmanta.com");
expect(t(`id-preview--${id}.lovable.app`)).toBe(`https://id-preview--${id}.lovable.app`);
expect(t(`${id}.lovable.app`)).toBe(`https://${id}.lovable.app`);});
