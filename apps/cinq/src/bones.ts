// apps/cinq/src/bones.ts
// Registers pre-captured boneyard bones so <Bone name="contacts"> resolves
// them instantly on first paint (zero first-load flash). Bones are produced by
// `pnpm boneyard:capture` (needs Chrome: `pnpm boneyard:setup`) and committed
// here. Until a real capture runs, this hand-authored descriptor defines the
// skeleton geometry for the contacts table.
import { registerBones } from "@ataqu/ui";
import contactsBones from "./bones/contacts.bones.json";

registerBones({
	contacts: contactsBones as Parameters<typeof registerBones>[0]["contacts"],
});

export { contactsBones };
