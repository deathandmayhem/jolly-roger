import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication("Jobs.publications.all", z.tuple([]));
