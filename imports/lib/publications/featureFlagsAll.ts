import z from "zod";
import TypedPublication from "./TypedPublication";

// All feature flags are always available on the client
export default new TypedPublication(null, z.tuple([]));
