import type { GuessType } from "./lib/models/Guesses";
import type { HuntType } from "./lib/models/Hunts";
import type { PuzzleType } from "./lib/models/Puzzles";
import type { TagType } from "./lib/models/Tags";

export type FixtureHuntType = Pick<HuntType, "_id" | "name"> & {
  tags: Pick<TagType, "_id" | "name">[];
  puzzles: (Pick<
    PuzzleType,
    "_id" | "title" | "url" | "expectedAnswerCount" | "tags"
  > & {
    guesses: (Pick<GuessType, "_id" | "guess" | "state"> & {
      additionalNotes?: string;
    })[];
  })[];
};

const FixtureHunt: FixtureHuntType = {
  _id: "S5BBzdFRnKSDktDwd",
  name: "Mystery Hunt 2018",
  tags: [
    { _id: "QeJLufdCqv7rMSSbS", name: "group:anger" },
    { _id: "9RDaMHxkZSJFezo6r", name: "group:build" },
    { _id: "avbpSWSL5YX9CNHpu", name: "group:deploy" },
    { _id: "FhwKoPgXvJ9iZzkG9", name: "group:disgust" },
    { _id: "o5JdfTizW4tGwhRnP", name: "group:emotions" },
    { _id: "6pxb246CFTmdsJpow", name: "group:events" },
    { _id: "Gwghj9nJfCzJBTwhQ", name: "group:fear" },
    { _id: "kghTda4PPdJYfJMuK", name: "group:flee" },
    { _id: "nPbTi6DPvjAkot94n", name: "group:games-island" },
    { _id: "PWZZge8id26rPH8t9", name: "group:hacking-island" },
    { _id: "vLzFKQuzAZZeQuAEX", name: "group:joy" },
    { _id: "m2EPY5Ty7ZPrkLisH", name: "group:sadness" },
    { _id: "NwhNGo64jRs384HwN", name: "group:scout" },
    { _id: "27YauwyRpL6yMsCef", name: "is:meta" },
    { _id: "3GmSvYwYM5zy9f2F2", name: "is:metameta" },
    { _id: "6uEokZ47zxWYp82c2", name: "meta-for:anger" },
    { _id: "ZJ2ihL4gT6gkmRgRo", name: "meta-for:build" },
    { _id: "mtzStZ4mwNmjzsbs2", name: "meta-for:deploy" },
    { _id: "u8brYN3fD9gAbYPmu", name: "meta-for:disgust" },
    { _id: "pq7EbR5SnY3C2iRmQ", name: "meta-for:fear" },
    { _id: "NfPmxPpNBQKNR2Y7M", name: "meta-for:flee" },
    { _id: "5rMx6AkFJnTxxn9g3", name: "meta-for:games-island" },
    { _id: "824j638yaMPZgRwCG", name: "meta-for:hacking-island" },
    { _id: "GHpDh3wjchBTm2Rnm", name: "meta-for:joy" },
    { _id: "2Z4MpQrREfBrnwLie", name: "meta-for:sadness" },
    { _id: "pgMERSdKeowNn2xpd", name: "meta-for:scout" },
  ],
  puzzles: [
    {
      _id: "fXchzrh8X9EoSZu6k",
      title: "Yeah, but It Didn’t Work!",
      url: "https://puzzles.mit.edu/2018/full/puzzle/yeah_but_it_didnt_work.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "QeJLufdCqv7rMSSbS"],
      guesses: [
        { _id: "obeeKs3ZEkBe3ykeg", guess: "AD NAUSEAM", state: "correct" },
      ],
    },
    {
      _id: "sZx8hSuCQ3nijFmjo",
      title: "Warm and Fuzzy",
      url: "https://puzzles.mit.edu/2018/full/puzzle/warm_and_fuzzy.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "vLzFKQuzAZZeQuAEX"],
      guesses: [
        { _id: "au5tuqM3NEpbtKY6s", guess: "INSIGHT", state: "correct" },
      ],
    },
    {
      _id: "qxyZuhSiozLoXCrS7",
      title: "Clueless",
      url: "https://puzzles.mit.edu/2018/full/puzzle/clueless.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "FhwKoPgXvJ9iZzkG9"],
      guesses: [
        { _id: "vAAFQL6CQjjoFjBbo", guess: "KERNEL", state: "correct" },
      ],
    },
    {
      _id: "XwXLY2hNDRcmrEeLX",
      title: "In Memoriam",
      url: "https://puzzles.mit.edu/2018/full/puzzle/in_memoriam.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "m2EPY5Ty7ZPrkLisH"],
      guesses: [
        {
          _id: "idK6wxaWCHpDbczpE",
          guess: "ISLAND OF OPPORTUNITY",
          state: "correct",
        },
      ],
    },
    {
      _id: "jCcDsEQDmKpygLj5j",
      title: "Freak Out",
      url: "https://puzzles.mit.edu/2018/full/puzzle/freak_out.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "Gwghj9nJfCzJBTwhQ"],
      guesses: [
        { _id: "a8srA9gF3iqBxbffz", guess: "SOUNDS", state: "correct" },
      ],
    },
    {
      _id: "JFyWGwD5roECxYk3a",
      title: "Let’s Get Ready to Jumble",
      url: "https://puzzles.mit.edu/2018/full/puzzle/lets_get_ready_to_jumble.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "QeJLufdCqv7rMSSbS"],
      guesses: [
        {
          _id: "yHtJYeqdmGkgCCcCL",
          guess: "TAPE YOUR HEEL TURN",
          state: "intermediate",
          additionalNotes:
            "Please upload your file to https://upload.head-hunters.org/.",
        },
        { _id: "wBik5mReoQMAhS6aX", guess: "ERIC ANGLE", state: "correct" },
      ],
    },
    {
      _id: "TfZjwQ8Z4k2hmRhCq",
      title: "AKA",
      url: "https://puzzles.mit.edu/2018/full/puzzle/aka.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "FhwKoPgXvJ9iZzkG9"],
      guesses: [
        { _id: "rXwyD8WBML8zHqgMQ", guess: "STEP DADDY", state: "correct" },
      ],
    },
    {
      _id: "t3ELZpXBz3FaiLe2i",
      title: "Unfortunate Al",
      url: "https://puzzles.mit.edu/2018/full/puzzle/unfortunate_al.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "m2EPY5Ty7ZPrkLisH"],
      guesses: [
        {
          _id: "FxSxquTZ7F4qwDyLS",
          guess: "INCREDIBLY STUPID",
          state: "correct",
        },
      ],
    },
    {
      _id: "vQdQNMmuM3QkKT23u",
      title: "A Learning Path",
      url: "https://puzzles.mit.edu/2018/full/puzzle/a_learning_path.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "Gwghj9nJfCzJBTwhQ", "FhwKoPgXvJ9iZzkG9"],
      guesses: [
        { _id: "QE46w8EKSMAEND6qn", guess: "EXCEPT", state: "correct" },
      ],
    },
    {
      _id: "eQpPRTrHJdYrGStFY",
      title: "Cross Words",
      url: "https://puzzles.mit.edu/2018/full/puzzle/cross_words.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "QeJLufdCqv7rMSSbS"],
      guesses: [
        { _id: "juFuFGnxwEHjLGfJq", guess: "ARGUE OVER", state: "correct" },
      ],
    },
    {
      _id: "KhjQ6DPp5Gwq6juuE",
      title: "We Are All Afraid to Die",
      url: "https://puzzles.mit.edu/2018/full/puzzle/we_are_all_afraid_to_die.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "Gwghj9nJfCzJBTwhQ"],
      guesses: [
        {
          _id: "NP82kJ8cEwf5uwW49",
          guess: "MEDICAL EMERGENCY",
          state: "correct",
        },
      ],
    },
    {
      _id: "yZKtXk5oLJMGqwP6E",
      title: "Temperance",
      url: "https://puzzles.mit.edu/2018/full/puzzle/temperance.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "QeJLufdCqv7rMSSbS", "FhwKoPgXvJ9iZzkG9"],
      guesses: [
        { _id: "9o3GKh9TPrnLDcoHu", guess: "BONE GRAFT", state: "correct" },
      ],
    },
    {
      _id: "JXLx7325fbEZmZnQk",
      title: "Word Search",
      url: "https://puzzles.mit.edu/2018/full/puzzle/word_search.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "Gwghj9nJfCzJBTwhQ", "m2EPY5Ty7ZPrkLisH"],
      guesses: [
        { _id: "FR2JKRhL3FKTp6rvx", guess: "GONORRHEA", state: "incorrect" },
        { _id: "cybpaQuntAoWWx5TS", guess: "NECESSARY", state: "correct" },
      ],
    },
    {
      _id: "hfLuHwt8iHpRRHABC",
      title: "Just Keep Swiping",
      url: "https://puzzles.mit.edu/2018/full/puzzle/just_keep_swiping.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "FhwKoPgXvJ9iZzkG9"],
      guesses: [
        { _id: "SEkwpkkTzjxQDdN7r", guess: "ROUGH DATE", state: "correct" },
      ],
    },
    {
      _id: "yL2otu4mhRC4HGw3d",
      title: "Caged",
      url: "https://puzzles.mit.edu/2018/full/puzzle/caged.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "vLzFKQuzAZZeQuAEX", "m2EPY5Ty7ZPrkLisH"],
      guesses: [
        { _id: "kCpXszsTR6dgLJkiB", guess: "HORSES", state: "correct" },
      ],
    },
    {
      _id: "nLgC7z8cRcnovBy7Y",
      title: "Minority Report",
      url: "https://puzzles.mit.edu/2018/full/puzzle/minority_report.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "FhwKoPgXvJ9iZzkG9"],
      guesses: [
        { _id: "Rdh3k7WaJWgQFHc6W", guess: "FILM COUNCILS", state: "correct" },
      ],
    },
    {
      _id: "zErakd8ndNvS3Aioz",
      title: "Asteroids",
      url: "https://puzzles.mit.edu/2018/full/puzzle/asteroids.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "QeJLufdCqv7rMSSbS"],
      guesses: [
        { _id: "bxP8TBGcaGdjQQ4QD", guess: "LASER BEAM", state: "correct" },
      ],
    },
    {
      _id: "Qtqs9hD6m7MYt8iam",
      title: "Good Fences Make Sad and Disgusted Neighbors",
      url: "https://puzzles.mit.edu/2018/full/puzzle/good_fences_make_sad_and_disgusted_neighbors.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "m2EPY5Ty7ZPrkLisH", "FhwKoPgXvJ9iZzkG9"],
      guesses: [
        { _id: "XRdcHMnF3n8bNEgME", guess: "HOW GREAT", state: "correct" },
      ],
    },
    {
      _id: "u7zPtrDTX3wSvfbTu",
      title: "Face Your Fears",
      url: "https://puzzles.mit.edu/2018/full/puzzle/face_your_fears.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "Gwghj9nJfCzJBTwhQ"],
      guesses: [
        { _id: "PMmwPMJvEk8aiJcy5", guess: "REGARDLESS", state: "correct" },
      ],
    },
    {
      _id: "QSCB9ZGawfZQizqmW",
      title: "Scattered and Absurd",
      url: "https://puzzles.mit.edu/2018/full/puzzle/scattered_and_absurd.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "QeJLufdCqv7rMSSbS", "m2EPY5Ty7ZPrkLisH"],
      guesses: [
        { _id: "Q9wxAbr8e8wx5PkP8", guess: "SUPERIORS", state: "correct" },
      ],
    },
    {
      _id: "Samtmy5LdNLcxWqHP",
      title: "Cooking a Recipe",
      url: "https://puzzles.mit.edu/2018/full/puzzle/cooking_a_recipe.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "vLzFKQuzAZZeQuAEX", "FhwKoPgXvJ9iZzkG9"],
      guesses: [
        { _id: "wpFmBSDdJe6pvXDfq", guess: "REAL FOOD", state: "correct" },
      ],
    },
    {
      _id: "yEZdXSXS4XcybsvXp",
      title: "Roadside America",
      url: "https://puzzles.mit.edu/2018/full/puzzle/roadside_america.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "QeJLufdCqv7rMSSbS", "Gwghj9nJfCzJBTwhQ"],
      guesses: [
        { _id: "TYZK74nDK7pBFQg6L", guess: "EXCURSION", state: "correct" },
      ],
    },
    {
      _id: "6mnHLb6HYp3bsahLn",
      title: "Crossed Paths",
      url: "https://puzzles.mit.edu/2018/full/puzzle/crossed_paths.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "vLzFKQuzAZZeQuAEX"],
      guesses: [
        { _id: "XL2e3vivnqW4cF9Mv", guess: "RITUAL", state: "correct" },
      ],
    },
    {
      _id: "bH3DmnKcabcvuTp9W",
      title: "On the A Line",
      url: "https://puzzles.mit.edu/2018/full/puzzle/on_the_a_line.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "FhwKoPgXvJ9iZzkG9"],
      guesses: [{ _id: "EnnQ8rctamQCkgTua", guess: "STYLE", state: "correct" }],
    },
    {
      _id: "WCpKXdtJtLiqvPyT4",
      title: "What’s In a Name?",
      url: "https://puzzles.mit.edu/2018/full/puzzle/whats_in_a_name.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "QeJLufdCqv7rMSSbS"],
      guesses: [
        { _id: "ibupxCGukcX6aMnC5", guess: "ELIZABETH", state: "correct" },
      ],
    },
    {
      _id: "epk4jZ8chxxpho44g",
      title: "Games Club",
      url: "https://puzzles.mit.edu/2018/full/puzzle/games_club.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "m2EPY5Ty7ZPrkLisH"],
      guesses: [
        { _id: "LLt8GWatdBrHuf7iL", guess: "PARTICIPATE", state: "correct" },
      ],
    },
    {
      _id: "uaMAnXEgj9SsvFZcv",
      title: "Birds of a Feather",
      url: "https://puzzles.mit.edu/2018/full/puzzle/birds_of_a_feather.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "vLzFKQuzAZZeQuAEX", "QeJLufdCqv7rMSSbS"],
      guesses: [
        { _id: "ofYdeS8khM2Dpr3eB", guess: "ASCENSION", state: "correct" },
      ],
    },
    {
      _id: "gpAcAiCGiKDAZTztf",
      title: "Nobody Likes Sad Songs",
      url: "https://puzzles.mit.edu/2018/full/puzzle/nobody_likes_sad_songs.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "m2EPY5Ty7ZPrkLisH"],
      guesses: [
        { _id: "fqnEPtJNgYAMQvpsN", guess: "VISION", state: "correct" },
      ],
    },
    {
      _id: "Li5ikreZpqY2s7HD3",
      title: "Irritating Places",
      url: "https://puzzles.mit.edu/2018/full/puzzle/irritating_places.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "QeJLufdCqv7rMSSbS"],
      guesses: [
        { _id: "paNCu7yxHdDBoW689", guess: "ASTRAKHAN", state: "correct" },
      ],
    },
    {
      _id: "8d7XPES3AvP2oWxX9",
      title: "What The...",
      url: "https://puzzles.mit.edu/2018/full/puzzle/what_the.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "vLzFKQuzAZZeQuAEX", "Gwghj9nJfCzJBTwhQ"],
      guesses: [
        { _id: "2yAYSNYxabrimjqEv", guess: "STRATEGY", state: "correct" },
      ],
    },
    {
      _id: "ymFLoyD9SKXGYjg9u",
      title: "Beast Workshop",
      url: "https://puzzles.mit.edu/2018/full/puzzle/beast_workshop.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "FhwKoPgXvJ9iZzkG9"],
      guesses: [
        { _id: "Hd9cHk2QjD7aeYPEa", guess: "NIGHTLY", state: "correct" },
      ],
    },
    {
      _id: "wwT2gwvpeGD3RBGEr",
      title: "That Time I Somehow Felt Incomplete",
      url: "https://puzzles.mit.edu/2018/full/puzzle/that_time_i_somehow_felt_incomplete.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "QeJLufdCqv7rMSSbS"],
      guesses: [
        { _id: "FyaSEos9TWKvbtd3H", guess: "EXAM GRADE", state: "correct" },
      ],
    },
    {
      _id: "BDviNTjeKSaFFRRRn",
      title: "Jeopardy!",
      url: "https://puzzles.mit.edu/2018/full/puzzle/jeopardy.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "Gwghj9nJfCzJBTwhQ"],
      guesses: [
        { _id: "HnS9opDNYRBhwBsR7", guess: "VOLUNTEER", state: "correct" },
      ],
    },
    {
      _id: "4Aoib4dvmmDApWPWH",
      title: "Chemistry Experimentation",
      url: "https://puzzles.mit.edu/2018/full/puzzle/chemistry_experimentation.html",
      expectedAnswerCount: 1,
      tags: ["o5JdfTizW4tGwhRnP", "QeJLufdCqv7rMSSbS"],
      guesses: [
        { _id: "JkddmqGnMAfHKG6uP", guess: "AMBER BEER", state: "correct" },
      ],
    },
    {
      _id: "Enve2KvnsSPnf3AZi",
      title: "Joy",
      url: "https://puzzles.mit.edu/2018/full/puzzle/joy.html",
      expectedAnswerCount: 1,
      tags: [
        "o5JdfTizW4tGwhRnP",
        "vLzFKQuzAZZeQuAEX",
        "GHpDh3wjchBTm2Rnm",
        "27YauwyRpL6yMsCef",
      ],
      guesses: [
        { _id: "mP8c9rvHTDR7DYYcw", guess: "BEAM UP", state: "correct" },
      ],
    },
    {
      _id: "tHgNPEYddvkvbc844",
      title: "Sadness",
      url: "https://puzzles.mit.edu/2018/full/puzzle/sadness.html",
      expectedAnswerCount: 1,
      tags: [
        "o5JdfTizW4tGwhRnP",
        "27YauwyRpL6yMsCef",
        "m2EPY5Ty7ZPrkLisH",
        "2Z4MpQrREfBrnwLie",
      ],
      guesses: [
        { _id: "6HasNYjRhHtAbms8H", guess: "TEAR DUCT", state: "correct" },
      ],
    },
    {
      _id: "KDWQCMWZGmR4YMyMC",
      title: "Fear",
      url: "https://puzzles.mit.edu/2018/full/puzzle/fear.html",
      expectedAnswerCount: 1,
      tags: [
        "o5JdfTizW4tGwhRnP",
        "27YauwyRpL6yMsCef",
        "Gwghj9nJfCzJBTwhQ",
        "pq7EbR5SnY3C2iRmQ",
      ],
      guesses: [
        { _id: "crwmPiQsMJcaiq59M", guess: "BOLDLY GO", state: "correct" },
      ],
    },
    {
      _id: "RMdhQr6XF4ysnmWAg",
      title: "Disgust",
      url: "https://puzzles.mit.edu/2018/full/puzzle/disgust.html",
      expectedAnswerCount: 1,
      tags: [
        "o5JdfTizW4tGwhRnP",
        "27YauwyRpL6yMsCef",
        "FhwKoPgXvJ9iZzkG9",
        "u8brYN3fD9gAbYPmu",
      ],
      guesses: [
        { _id: "HQPvyBHozBpkecewo", guess: "RAPPEL", state: "correct" },
      ],
    },
    {
      _id: "DsJRvwWk5h8pY7W4b",
      title: "Anger",
      url: "https://puzzles.mit.edu/2018/full/puzzle/anger.html",
      expectedAnswerCount: 1,
      tags: [
        "o5JdfTizW4tGwhRnP",
        "27YauwyRpL6yMsCef",
        "QeJLufdCqv7rMSSbS",
        "6uEokZ47zxWYp82c2",
      ],
      guesses: [
        {
          _id: "wehFKp7n7KySbsNZB",
          guess: "PICK A FIGHT WITH LOCK",
          state: "correct",
        },
      ],
    },
    {
      _id: "hLFyTgtPqgXqCpPEW",
      title: "Care and Feeding of Your Mystery Hunt Team (Fri, 7:00PM)",
      url: "https://puzzles.mit.edu/2018/full/puzzle/care_and_feeding_of_your_mystery_hunt_team.html",
      expectedAnswerCount: 1,
      tags: ["6pxb246CFTmdsJpow"],
      guesses: [
        { _id: "x9miKALfxKvu8oKuW", guess: "CLEAN UP", state: "correct" },
      ],
    },
    {
      _id: "QvW6PoXpm6woKTSxK",
      title:
        "Effective Resource Management in High Stress Situations (Fri, 10:00PM)",
      url: "https://puzzles.mit.edu/2018/full/puzzle/effective_resource_management_in_high_stress_situations.html",
      expectedAnswerCount: 1,
      tags: ["6pxb246CFTmdsJpow"],
      guesses: [
        { _id: "BcftzWPa3KQqoWarv", guess: "NICK OF TIME", state: "correct" },
      ],
    },
    {
      _id: "hWP2aPzQSyeK9zbqR",
      title: "Covering Your Ass With Caution Tape (Sat, 9:00AM)",
      url: "https://puzzles.mit.edu/2018/full/puzzle/covering_your_ass_with_caution_tape.html",
      expectedAnswerCount: 1,
      tags: ["6pxb246CFTmdsJpow"],
      guesses: [
        {
          _id: "Jr9B3k2kD3i72o7zz",
          guess: "MEASURE TWICE CUT ONCE",
          state: "correct",
        },
      ],
    },
    {
      _id: "KForsXaMQutWujXS3",
      title: "Stretching and Calisthenics (Sat, 2:00PM)",
      url: "https://puzzles.mit.edu/2018/full/puzzle/stretching_and_calisthenics.html",
      expectedAnswerCount: 1,
      tags: ["6pxb246CFTmdsJpow"],
      guesses: [
        {
          _id: "fh978nKrtmiCfYDJg",
          guess: "ROOT BEER FLOAT",
          state: "correct",
        },
      ],
    },
    {
      _id: "rpgGvAcifwGHBizii",
      title: "Communication and Cooperation for Proper Teamwork (Sat, 7:00PM)",
      url: "https://puzzles.mit.edu/2018/full/puzzle/communication_and_cooperation_for_proper_teamwork.html",
      expectedAnswerCount: 1,
      tags: ["6pxb246CFTmdsJpow"],
      guesses: [
        {
          _id: "3bQYzutT3zDiXLKzN",
          guess: "KEEP IT TOGETHER",
          state: "correct",
        },
      ],
    },
    {
      _id: "eoscDr46t5Pjuk8C3",
      title: "This Year’s Hardest Crossword",
      url: "https://puzzles.mit.edu/2018/full/puzzle/this_years_hardest_crossword.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        {
          _id: "kfeD2uWtGfCns5uoB",
          guess: "NOW SOLVE TODAY'S LISTENER",
          state: "intermediate",
          additionalNotes:
            "The Listener can be found at http://www.listenercrossword.com/Solutions/S2018/Notes_4485.html",
        },
        { _id: "ukBCpRvEYNtmADDgX", guess: "WHOOPEE", state: "correct" },
      ],
    },
    {
      _id: "p3RTZLXXt2n47kAJX",
      title: "Flattery Will Get You Nowhere",
      url: "https://puzzles.mit.edu/2018/full/puzzle/flattery_will_get_you_nowhere.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        { _id: "JhcRxkskC8m5JbKyn", guess: "PORTMANTEAU", state: "correct" },
      ],
    },
    {
      _id: "vgjpuSksmkd4txzEL",
      title: "Sports Radio",
      url: "https://puzzles.mit.edu/2018/full/puzzle/sports_radio.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        {
          _id: "SxZ7jcaLwRJ65iooc",
          guess: "ULTIMATE FRISBEE",
          state: "correct",
        },
      ],
    },
    {
      _id: "D8koE3yHo4zDPsqrK",
      title: "Tournament Organization",
      url: "https://puzzles.mit.edu/2018/full/puzzle/tournament_organization.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        { _id: "ty6XhdxY5dypoCW7m", guess: "SPOT THE BALL", state: "correct" },
      ],
    },
    {
      _id: "bdYQp7iQXCmHnXzeR",
      title: "All the Right Angles",
      url: "https://puzzles.mit.edu/2018/full/puzzle/all_the_right_angles.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        { _id: "7RcPgs2f98SZvbD6s", guess: "POCKET MONEY", state: "correct" },
      ],
    },
    {
      _id: "oiYBG7codxqCnaMg8",
      title: "Cartography",
      url: "https://puzzles.mit.edu/2018/full/puzzle/cartography.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        { _id: "c4ZXuzP3R8nWr3cPC", guess: "PINNACLES", state: "correct" },
      ],
    },
    {
      _id: "n68eqTvZxaY7XRYZh",
      title: "Pestered",
      url: "https://puzzles.mit.edu/2018/full/puzzle/pestered.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        { _id: "gi2waG948jjsdpwcW", guess: "MASTER AT ARMS", state: "correct" },
      ],
    },
    {
      _id: "E8RMTS7f6ku9i9kDD",
      title: "A Tribute: 2010-2017",
      url: "https://puzzles.mit.edu/2018/full/puzzle/a_tribute_2010_2017.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        { _id: "5cA9nqpdiKgPfShHj", guess: "MEMORIAL", state: "correct" },
      ],
    },
    {
      _id: "s4q8ruLiiN4fR3RCb",
      title: "GRATIA PLENA",
      url: "https://puzzles.mit.edu/2018/full/puzzle/gratia_plena.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        { _id: "JQu85Z4CtLYeQwd6n", guess: "CODEX RUNICUS", state: "correct" },
      ],
    },
    {
      _id: "Nt7MzPg9FmHB6dJso",
      title: "Thanks",
      url: "https://puzzles.mit.edu/2018/full/puzzle/thanks.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        { _id: "EsdxjHKgphrfnTMfv", guess: "PANDORA", state: "correct" },
      ],
    },
    {
      _id: "eAS2328WXAnnREYdv",
      title: "Walk Across Some Dungeons 2",
      url: "https://puzzles.mit.edu/2018/full/puzzle/walk_across_some_dungeons_2.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        {
          _id: "yTFGdwKzP7oWALaTW",
          guess: "KEYBOARD PLAYER",
          state: "correct",
        },
      ],
    },
    {
      _id: "MZH8Wcaui8Ahr42Ko",
      title: "Special Delivery",
      url: "https://puzzles.mit.edu/2018/full/puzzle/special_delivery.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        {
          _id: "v8fxXBfvn3HdXpNrZ",
          guess: "WE WANT A MOCKTAIL",
          state: "intermediate",
          additionalNotes:
            "Please bring your beverage to 66-100, and be prepared to tell them your team and the instruction that brought you here.",
        },
        { _id: "fN4zRHuk2xJkq6Wcr", guess: "DIRTY MARTINI", state: "correct" },
      ],
    },
    {
      _id: "oL8CLFBzdt8DKQjCb",
      title: "Do You Want A",
      url: "https://puzzles.mit.edu/2018/full/puzzle/do_you_want_a.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        { _id: "CeKrsGCBmufdbtSKK", guess: "ONSIGHT", state: "correct" },
      ],
    },
    {
      _id: "Yh4zw7oitEPyvZumB",
      title: "Shift",
      url: "https://puzzles.mit.edu/2018/full/puzzle/shift.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        { _id: "EBkZFnKcDe64BqiMT", guess: "SLEEPER AGENT", state: "correct" },
      ],
    },
    {
      _id: "hiMpJHfWjotCGb9NT",
      title: "America’s Best Friends",
      url: "https://puzzles.mit.edu/2018/full/puzzle/americas_best_friends.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [
        {
          _id: "5bYkNpXBC2mAdZBDC",
          guess: "JONATHAN EDWARDS",
          state: "pending",
        },
      ],
    },
    {
      _id: "ovngS9XCjtT2DK5kM",
      title: "Little Passages",
      url: "https://puzzles.mit.edu/2018/full/puzzle/little_passages.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [],
    },
    {
      _id: "Wmq2gDhZwPhBaWgM3",
      title: "Middle of the Road",
      url: "https://puzzles.mit.edu/2018/full/puzzle/middle_of_the_road.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [],
    },
    {
      _id: "MaLLbExKyDdyrYLSS",
      title: "Death From Aslant",
      url: "https://puzzles.mit.edu/2018/full/puzzle/death_from_aslant.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n"],
      guesses: [],
    },
    {
      _id: "NeMxJZKPGqN7CcmcN",
      title: "The Desert",
      url: "https://puzzles.mit.edu/2018/full/puzzle/the_desert.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n", "27YauwyRpL6yMsCef", "5rMx6AkFJnTxxn9g3"],
      guesses: [
        {
          _id: "DPomSLQiQ2SzYfy9X",
          guess: "INTERCOASTAL EMPIRE",
          state: "correct",
        },
      ],
    },
    {
      _id: "3zTi6pDY9mHJSbLoS",
      title: "The Robber",
      url: "https://puzzles.mit.edu/2018/full/puzzle/the_robber.html",
      expectedAnswerCount: 1,
      tags: ["nPbTi6DPvjAkot94n", "27YauwyRpL6yMsCef", "5rMx6AkFJnTxxn9g3"],
      guesses: [],
    },
    {
      _id: "EvCuubJ4T5mrxtdQ3",
      title: "No Context",
      url: "https://puzzles.mit.edu/2018/full/puzzle/no_context.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "NwhNGo64jRs384HwN"],
      guesses: [
        { _id: "GwWpEqGMiMLAa8SvP", guess: "CHECKPOINT", state: "correct" },
      ],
    },
    {
      _id: "F2TeHBmuXXCjDY9bz",
      title: "The Lurking Horror II: The Lurkening",
      url: "https://puzzles.mit.edu/2018/full/puzzle/the_lurking_horror_ii_the_lurkening.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "NwhNGo64jRs384HwN"],
      guesses: [
        { _id: "QuvxE7AtMTptTSzLJ", guess: "ADVENTURE", state: "correct" },
      ],
    },
    {
      _id: "tDWaNvNBMwWLhzNsi",
      title: "Bark Ode",
      url: "https://puzzles.mit.edu/2018/full/puzzle/bark_ode.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "NwhNGo64jRs384HwN"],
      guesses: [
        { _id: "P6xLHMw8supFAxNhQ", guess: "TENDINOPATHIES", state: "correct" },
      ],
    },
    {
      _id: "shKWQ5NLnR8Noz53m",
      title: "Voter Fraud",
      url: "https://puzzles.mit.edu/2018/full/puzzle/voter_fraud.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "NwhNGo64jRs384HwN"],
      guesses: [
        { _id: "kSkLNE6DRYaD5SoR2", guess: "SKYSCRAPER", state: "correct" },
      ],
    },
    {
      _id: "88N2A4ek7A4jfnL7i",
      title: "The 10,000 Puzzle Tesseract",
      url: "https://puzzles.mit.edu/2018/full/puzzle/the_10000_puzzle_tesseract.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "NwhNGo64jRs384HwN"],
      guesses: [
        { _id: "RTwGKJqAtm6xghKvf", guess: "PERSONNEL", state: "correct" },
      ],
    },
    {
      _id: "vTfpYRaC2bg8iiB4u",
      title: "Worldwide Contacts",
      url: "https://puzzles.mit.edu/2018/full/puzzle/worldwide_contacts.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "NwhNGo64jRs384HwN"],
      guesses: [
        { _id: "3gTZKQpnTTwZa2b2c", guess: "INTERNATIONAL", state: "correct" },
      ],
    },
    {
      _id: "4B5umRZySigiXGY7t",
      title: "Texts From Mom",
      url: "https://puzzles.mit.edu/2018/full/puzzle/texts_from_mom.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "NwhNGo64jRs384HwN"],
      guesses: [
        { _id: "96G2tGePMBPFpiLT9", guess: "EXTEND", state: "correct" },
      ],
    },
    {
      _id: "HpP7JMrgaZvsiGKGp",
      title: "Murder at the Asylum",
      url: "https://puzzles.mit.edu/2018/full/puzzle/murder_at_the_asylum.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "NwhNGo64jRs384HwN"],
      guesses: [],
    },
    {
      _id: "YxhGFEJn9e3s94e9X",
      title: "Scout",
      url: "https://puzzles.mit.edu/2018/full/puzzle/scout.html",
      expectedAnswerCount: 1,
      tags: [
        "PWZZge8id26rPH8t9",
        "NwhNGo64jRs384HwN",
        "27YauwyRpL6yMsCef",
        "pgMERSdKeowNn2xpd",
        "kghTda4PPdJYfJMuK",
      ],
      guesses: [
        { _id: "ZnbzjovGdQA7sd67d", guess: "EXOSKELETON", state: "correct" },
      ],
    },
    {
      _id: "h2qPzvLuG2HuLCvWj",
      title: "Is There a Draft in Here?",
      url: "https://puzzles.mit.edu/2018/full/puzzle/is_there_a_draft_in_here.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "9RDaMHxkZSJFezo6r"],
      guesses: [
        { _id: "BE9sDXDqE6GuBYAxK", guess: "DRUNK ENOUGH", state: "correct" },
      ],
    },
    {
      _id: "BtWbqspfjow4uDpJi",
      title: "Marked Deck",
      url: "https://puzzles.mit.edu/2018/full/puzzle/marked_deck.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "9RDaMHxkZSJFezo6r"],
      guesses: [
        { _id: "MsqvutBm9kRWyyb9r", guess: "ROLLIN HAND", state: "correct" },
      ],
    },
    {
      _id: "jptsWtYmiodvxRFkB",
      title: "Model Kit",
      url: "https://puzzles.mit.edu/2018/full/puzzle/model_kit.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "9RDaMHxkZSJFezo6r"],
      guesses: [
        {
          _id: "BaaJYkCKACZawCkHX",
          guess: "CHEMISTRY SAVVY",
          state: "correct",
        },
      ],
    },
    {
      _id: "7nFkhb84xhx5iKxpm",
      title: "Arts and Crafts",
      url: "https://puzzles.mit.edu/2018/full/puzzle/arts_and_crafts.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "9RDaMHxkZSJFezo6r"],
      guesses: [
        {
          _id: "zQf7his5HcxmesfC6",
          guess: "DON'T BRUSH US OFF",
          state: "intermediate",
          additionalNotes:
            "Please come to 66-110 to pick up your item. Make sure to knock, and don’t come in until we let you in. Be prepared to say what team you’re with and the request that you submitted.",
        },
        {
          _id: "eaWNnnySz8kqDwcXu",
          guess: "MAKE A TIFO AND HOIST FOR HQ",
          state: "intermediate",
          additionalNotes:
            "Please upload your file to https://upload.head-hunters.org/.",
        },
        {
          _id: "jtTXcz8QXJfJYvzNx",
          guess: "CONFINED AQUIFER",
          state: "correct",
        },
      ],
    },
    {
      _id: "RxoCqBP6wQyDkT8NQ",
      title: "Blocked Lines",
      url: "https://puzzles.mit.edu/2018/full/puzzle/blocked_lines.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "9RDaMHxkZSJFezo6r"],
      guesses: [
        {
          _id: "tcTAgnRefAKGtWBGC",
          guess: "SQUARE POINTS",
          state: "intermediate",
          additionalNotes:
            "Please come to 66-110 to pick up your item. Make sure to knock, and don’t come in until we let you in. Be prepared to say what team you’re with and the request that you submitted.",
        },
        { _id: "9KtYfxo7dG2fNkEdy", guess: "THREE POUNDER", state: "correct" },
      ],
    },
    {
      _id: "oKngMGGxyjRhDhAEh",
      title: "Fowlty Towers",
      url: "https://puzzles.mit.edu/2018/full/puzzle/fowlty_towers.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "9RDaMHxkZSJFezo6r"],
      guesses: [],
    },
    {
      _id: "ZGenDuRpbWa3vPLNH",
      title: "Don’t Look",
      url: "https://puzzles.mit.edu/2018/full/puzzle/dont_look.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "9RDaMHxkZSJFezo6r"],
      guesses: [],
    },
    {
      _id: "2sSWptrSFs6wCCjAd",
      title: "Wolf in the Fold",
      url: "https://puzzles.mit.edu/2018/full/puzzle/wolf_in_the_fold.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "9RDaMHxkZSJFezo6r"],
      guesses: [],
    },
    {
      _id: "XcCSfJKhLQMBYYr3s",
      title: "Build",
      url: "https://puzzles.mit.edu/2018/full/puzzle/build.html",
      expectedAnswerCount: 1,
      tags: [
        "PWZZge8id26rPH8t9",
        "9RDaMHxkZSJFezo6r",
        "27YauwyRpL6yMsCef",
        "ZJ2ihL4gT6gkmRgRo",
        "kghTda4PPdJYfJMuK",
      ],
      guesses: [
        { _id: "TWfjQ68Y6Fa2ZgSSm", guess: "BIOFUEL TORCH", state: "correct" },
      ],
    },
    {
      _id: "ZufEumovmctRSnyFf",
      title: "Scouting Challenge",
      url: "https://puzzles.mit.edu/2018/full/puzzle/scouting_challenge.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9"],
      guesses: [
        { _id: "6cb5p87zDZsQrFJL8", guess: "TRUST NO ONE", state: "correct" },
      ],
    },
    {
      _id: "CAgbuza4av8WgjofN",
      title: "Building Challenge",
      url: "https://puzzles.mit.edu/2018/full/puzzle/building_challenge.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9"],
      guesses: [
        {
          _id: "d8ArsjzFPHZ5DR5MJ",
          guess: "REDUCE AND RECYCLE",
          state: "correct",
        },
      ],
    },
    {
      _id: "GrTLWHPQaGiRWf983",
      title: "A Pub Crawl",
      url: "https://puzzles.mit.edu/2018/full/puzzle/a_pub_crawl.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "avbpSWSL5YX9CNHpu"],
      guesses: [
        { _id: "mAyrKK8iBSgt7xbYi", guess: "SOLERA", state: "correct" },
      ],
    },
    {
      _id: "2YwZtuNXQW8j8P7qr",
      title: "Executive Relationship Commandments",
      url: "https://puzzles.mit.edu/2018/full/puzzle/executive_relationship_commandments.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "avbpSWSL5YX9CNHpu"],
      guesses: [
        { _id: "545E7sSZxxd7DL9q5", guess: "PENPAL", state: "correct" },
      ],
    },
    {
      _id: "naXGFBwfucE6WNAjC",
      title: "Zelma & Frank",
      url: "https://puzzles.mit.edu/2018/full/puzzle/zelma_frank.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "avbpSWSL5YX9CNHpu"],
      guesses: [
        { _id: "i5gdoj74veJjbZr9g", guess: "HIKE UP", state: "correct" },
      ],
    },
    {
      _id: "iexwvYYYPAqZJi2oE",
      title: "Ode to the Greeks",
      url: "https://puzzles.mit.edu/2018/full/puzzle/ode_to_the_greeks.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "avbpSWSL5YX9CNHpu"],
      guesses: [
        { _id: "ZBTLBdsBTmkxCe76w", guess: "NEBULA", state: "correct" },
      ],
    },
    {
      _id: "ZTzrQsQePCg2mDtFj",
      title: "Studies in Two-Factor Authentication",
      url: "https://puzzles.mit.edu/2018/full/puzzle/studies_in_two_factor_authentication.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "avbpSWSL5YX9CNHpu"],
      guesses: [
        { _id: "X8qFFsfebNxxh5Kmr", guess: "BOTNET", state: "correct" },
      ],
    },
    {
      _id: "L2iQyYMkqFsmYqEKr",
      title: "L is for Library",
      url: "https://puzzles.mit.edu/2018/full/puzzle/l_is_for_library.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9", "avbpSWSL5YX9CNHpu"],
      guesses: [
        { _id: "tDb2p2nvoMEurcTwW", guess: "OCELOT", state: "correct" },
      ],
    },
    {
      _id: "uuTSi4WYwJmDroW5A",
      title: "Deploy",
      url: "https://puzzles.mit.edu/2018/full/puzzle/deploy.html",
      expectedAnswerCount: 1,
      tags: [
        "PWZZge8id26rPH8t9",
        "avbpSWSL5YX9CNHpu",
        "27YauwyRpL6yMsCef",
        "mtzStZ4mwNmjzsbs2",
        "kghTda4PPdJYfJMuK",
      ],
      guesses: [
        { _id: "6CFPPdcJfgRuxoR8K", guess: "BACKUP PLAN", state: "correct" },
      ],
    },
    {
      _id: "brhxu8L3rmY5px3FS",
      title: "Deployment Challenge",
      url: "https://puzzles.mit.edu/2018/full/puzzle/deployment_challenge.html",
      expectedAnswerCount: 1,
      tags: ["PWZZge8id26rPH8t9"],
      guesses: [
        { _id: "uFyDyi9LhddBxiRht", guess: "JUST IN CASE", state: "correct" },
      ],
    },
    {
      _id: "ufre63FZ45F4CQ9hg",
      title: "Flee",
      url: "https://puzzles.mit.edu/2018/full/puzzle/flee.html",
      expectedAnswerCount: 1,
      tags: [
        "PWZZge8id26rPH8t9",
        "3GmSvYwYM5zy9f2F2",
        "kghTda4PPdJYfJMuK",
        "824j638yaMPZgRwCG",
        "NfPmxPpNBQKNR2Y7M",
      ],
      guesses: [],
    },
  ],
};

export default FixtureHunt;
