"use server";

import { auth } from "@/lib/auth/auth";

export async function addUser() {
  await auth.api.createUser({
    body: {
      email: "super-admin@perapixel.com",
      password: "password@123",
      name: "Super Admin",
    },
  });
}
