import { MongoClient } from "mongodb";

const URI = process.env.MONGODB || "mongodb://localhost:27017";
const client = new MongoClient(URI);
const dbname = "sample_mflix";
const collection_name = "movies";
const moviesCollection = client.db(dbname).collection(collection_name);

const autocomplete = async (title) => {
  try {
    const pipeline = [
      {
        $search: {
          autocomplete: {
            path: "title",
            query: title,
            fuzzy: { maxEdits: 1 },
          },
        },
      },
      {
        $project: { title: 1 },
      },
      {
        $limit: 10,
      },
    ];
    await client.connect();
    console.log("Connected to the database 🌍");
    const result = moviesCollection.aggregate(pipeline);
    for await (const doc of result) {
      console.log(doc);
    }
  } catch (err) {
    console.log(`Error connecting to the database: ${err}`);
  } finally {
    await client.close();
  }
};

// autocomplete("Harry");

const filteredMovies = async ({ term, genres, countries }) => {
  try {
    const searchShould = [];
    const searchMust = [];

    if (term.length > 0) {
      const termStage = {
        autocomplete: {
          path: "title",
          query: term,
          fuzzy: { maxEdits: 1.0 },
          score: {
            boost: {
              path: "imdb.rating",
              undefined: 1,
            },
          },
        },
      };
      searchMust.push(termStage);

      const plotStage = {
        text: {
          query: term,
          path: "plot",
        },
      };
      searchShould.push(plotStage);
    }

    if (genres.length > 0) {
      const genresStage = {
        text: {
          query: genres,
          path: "genres",
        },
      };
      searchMust.push(genresStage);
    }

    if (countries.length > 0) {
      const countryStage = {
        text: {
          query: countries,
          path: "countries",
        },
      };
      searchMust.push(countryStage);
    }

    const searchQuery = [
      {
        $search: {
          compound: {
            should: searchShould,
            must: searchMust,
          },
          highlight: { path: ["title", "genres", "countries", "plot"] },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          poster: 1,
          cast: 1,
          directors: 1,
          plot: 1,
          fullplot: 1,
          year: 1,
          genres: 1,
          countries: 1,
          imdb: 1,
          score: { $meta: "searchScore" },
          highlights: { $meta: "searchHighlights" },
        },
      },
      { $limit: 20 },
    ];
    await client.connect();
    console.log("Connected to the database 🌍");
    const result = moviesCollection.aggregate(searchQuery);
    for await (const doc of result) {
      console.log(doc);
    }
  } catch (err) {
    console.log(`Error connecting to the database: ${err}`);
  } finally {
    await client.close();
  }
};
filteredMovies({
  term: "sea", // somehow doesn't work if term is an empty string
  genres: ["Drama"],
  countries: [],
});

const facetsGenres = async () => {
  try {
    const pipeline = [
      {
        $searchMeta: {
          index: "facets",
          facet: {
            operator: {
              range: {
                path: "year",
                gte: 1900,
              },
            },
            facets: {
              genresFacet: {
                type: "string",
                path: "genres",
              },
            },
          },
        },
      },
    ];
    await client.connect();
    console.log("Connected to the database 🌍");
    const result = moviesCollection.aggregate(pipeline);
    for await (const doc of result) {
      console.log(doc.facet.genresFacet);
    }
  } catch (err) {
    console.log(`Error connecting to the database: ${err}`);
  } finally {
    await client.close();
  }
};
// facetsGenres();
