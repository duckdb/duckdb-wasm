import { pipe } from "@arrows/composition";
import { Event, Suite } from "benchmark";
import * as kleur from "kleur";
import { SkipResult } from "./add";
import { Summary } from "./internal/common-types";
import getSummary from "./internal/getSummary";

type RawPartialMethod = (suiteObj: Suite) => Suite;
type PartialMethod = Promise<RawPartialMethod | SkipResult>;

type SuiteFn = (name: string, ...fns: PartialMethod[]) => Promise<Summary>;

/**
 * Creates and runs benchmark suite
 */
const suite: SuiteFn = async (name, ...fns) => {
  const unpackedFns = await Promise.all([...fns]);
  const suiteObj = new Suite(name).on("start", () => {
    console.log(kleur.blue(`Running "${name}" suite...`));
  });

  const hasOnly = unpackedFns.filter((fn) => fn.name === "only").length > 0;
  const items = (hasOnly
    ? unpackedFns.filter((fn) => fn.name !== "add" && fn.name !== "skip")
    : unpackedFns.filter((fn) => fn.name !== "skip")) as RawPartialMethod[];

  return new Promise((resolve, reject) => {
    (pipe(...items)(suiteObj) as Suite)
      .on("complete", (event: Event) => resolve(getSummary(event)))
      .on("error", reject)
      .run();
  });
};

export { suite };
export default suite;
