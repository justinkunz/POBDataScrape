const axios = require("axios");
const fs = require("fs");

const MAP_LAYERS_API_URL =
  "https://app.mapline.com/api/v1/maps/map_7e9f8d7?expand=layers&expand=banners&&_=1665893025310";
const MAP_LAYER_DETAILS_API_URL = (layerId) =>
  `https://app.mapline.com/api/v1/maps/map_7e9f8d7/layers/${layerId}?expand%5B%5D=Children`;
const MPL_PUBLIC_TOKEN = "Pz83Pz8UaD8UdiwUP0gUAD8UAz9RPz8UZT8JHT8UPz9GPz8UP0";

const headers = {
  ["mpl-public-token"]: MPL_PUBLIC_TOKEN,
};

const getMapLayers = async () => {
  const { data } = await axios({
    method: "GET",
    url: MAP_LAYERS_API_URL,
    headers,
  });

  return data.Layers.map(({ Id }) => Id);
};

const getLayerDetails = async (layerId) => {
  const {
    data: {
      Children: pins,
      DataSource: { Headers: dataSourceFields },
    },
  } = await axios({
    method: "GET",
    url: MAP_LAYER_DETAILS_API_URL(layerId),
    headers,
  });

  const fields = dataSourceFields.map(({ Name }) =>
    // covert fields to camel case and shorten to first 4 words
    Name.toLowerCase()
      .split(" ")
      .splice(0, 4)
      .join("_")
      // special cases to remove some general ugliness
      .replaceAll("_-_(even", "")
      .replaceAll("?", "")
      .replaceAll("_/_", "_")
      .replaceAll("please_", "")
      // and wacky field titles
      .replaceAll("choose_a_primary", "category")
      .replaceAll("describe_your_business", "description")
  );

  const formatValue = (val) => {
    if (val === "") return null;

    if (val.toLowerCase() === "yes") return true;
    if (val.toLowerCase() === "no") return false;

    if (!Number.isNaN(Number(val))) return Number(val);

    return val;
  };

  return pins.map((pin) => {
    const businessData = pin.DataSource.Values.reduce((acc, curr, i) => {
      acc[fields[i]] = formatValue(curr);
      return acc;
    }, {});

    const { Lat: lat, Lng: long } = pin.LatLng;
    businessData.location = {
      lat,
      long,
    };

    return businessData;
  });
};

const writeToFile = (fileName, data) =>
  fs.writeFileSync(fileName, JSON.stringify(data, null, 2));

const findAmericasWorst = async () => {
  const layers = await getMapLayers();
  const resultsByLayer = await Promise.all(layers.map(getLayerDetails));
  const combinedResults = resultsByLayer.flat();

  console.log(combinedResults);
  writeToFile("data.json", combinedResults);
};

findAmericasWorst();
