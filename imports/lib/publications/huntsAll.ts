import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication("Hunts.publications.all", z.tuple([]));
