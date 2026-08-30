import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication("Settings.publications.all", z.tuple([]));
