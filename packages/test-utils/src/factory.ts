import type { User } from "@ataqu/types";
import { faker } from "@faker-js/faker";
export const createTestUser = (overrides?: Partial<User>): User => ({
	id: faker.string.uuid(),
	email: faker.internet.email(),
	tenantId: faker.string.uuid(),
	roles: ["admin"],
	name: faker.person.fullName(),
	...overrides,
});
