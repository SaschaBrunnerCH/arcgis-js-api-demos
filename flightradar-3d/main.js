require([
  "esri/renderers/visualVariables/SizeVariable",
  "esri/renderers/visualVariables/ColorVariable",
  "esri/Map",
  "esri/views/SceneView",
  "esri/request",
  "esri/Graphic",
  "esri/geometry/Point",
  "esri/geometry/SpatialReference",
  "esri/layers/FeatureLayer",
  "esri/symbols/PointSymbol3D",
  "esri/symbols/IconSymbol3DLayer",
  "esri/symbols/ObjectSymbol3DLayer",
  "esri/renderers/SimpleRenderer",
  "esri/widgets/Expand",
  "esri/geometry/Extent",
  "esri/renderers/visualVariables/RotationVariable",
], function (
  SizeVariable,
  ColorVariable,
  Map,
  SceneView,
  esriRequest,
  Graphic,
  Point,
  SpatialReference,
  FeatureLayer,
  PointSymbol3D,
  IconSymbol3DLayer,
  ObjectSymbol3DLayer,
  SimpleRenderer,
  Expand,
  Extent,
  RotationVariable
) {
  const exaggeratedHeight = 10;
  const renderericon = new SimpleRenderer({
    symbol: new PointSymbol3D({
      symbolLayers: [
        new IconSymbol3DLayer({
          size: 20, // points
          resource: {
            href: "https://static.arcgis.com/arcgis/styleItems/Icons/web/resource/Airport.svg",
          },
          material: { color: [0, 122, 194] },
        }),
      ],
    }),
  });

  const renderer = new SimpleRenderer({
    symbol: new PointSymbol3D({
      symbolLayers: [
        new ObjectSymbol3DLayer({
          width: 22000,
          anchor: "origin",
          heading: 0,
          resource: {
            href: "https://staticdev.arcgis.com/arcgis/styleItems/RealisticTransportation/web/resource/Airplane_Large_Passenger.json",
          },
        }),
      ],
    }),
    visualVariables: [
      new RotationVariable({
        valueExpression: "$feature.true_track",
        axis: "heading",
      }),
      new RotationVariable({
        valueExpression: "Constrain( $feature.vertical_rate, -45, 45 )",
        axis: "tilt",
      }),
      new ColorVariable({
        valueExpression: "$feature.baro_altitude",
        stops: [
          { value: 1000, color: "#ef8a62" }, // red
          { value: 5000, color: "#FFFFFF" }, // white
          { value: 10000, color: "#67a9cf" }, // blue
        ],
      }),
      new SizeVariable({
        valueExpression: "$feature.baro_altitude",
        axis: "height",
        stops: [
          { value: 1000, size: 1000 },
          { value: 5000, size: 5000 },
          { value: 10000, size: 10000 },
        ],
      }),
    ],
  });

  const extentEurope = new Extent({
    xmin: -20.742622364010256,
    ymin: 24.153343808447573,
    xmax: 46.80132294847179,
    ymax: 58.942399387376156,
    spatialReference: SpatialReference.WGS84,
  });

  const extentUSCalifornia = new Extent({
    xmin: -120.10235616657884,
    ymin: 31.417694756782257,
    xmax: -114.38397237751788,
    ymax: 36.00760678975606,
    spatialReference: SpatialReference.WGS84,
  });

  const extent = extentEurope;
  const elevationInfoMode = "absolute-height"; // "absolute-height", "on-the-ground"

  const map = new Map({
    basemap: "gray",
    ground: "world-elevation",
  });

  const view = new SceneView({
    container: "viewDiv",
    map: map,
    viewingMode: "local",
    clippingArea: extent,
    camera: {
      position: {
        spatialReference: SpatialReference.WGS84,
        x: 6,
        y: 43,
        z: 1000000,
      },
      heading: 20,
      tilt: 40,
    },
  });

  view.popup.defaultPopupTemplateEnabled = true;

  // Create expanded information tab
  let titleContent = document.createElement("div");
  titleContent.style.padding = "15px";
  titleContent.style.backgroundColor = "white";
  titleContent.style.width = "500px";
  titleContent.innerHTML = [
    "<div id='title' class='esri-widget'>",
    "Next udpate in <span id='next-update'>0</span> seconds. TOTAL plane in this area: <span id='num-plane-in-the-air-total'>0</span>.  <span id='updated' style='color:red; font-weight: bold; visibility: hidden;'>-updated-</span>",
    "</div>",
  ].join(" ");
  const titleExpand = new Expand({
    expandIconClass: "esri-icon-dashboard",
    expandTooltip: "Summary stats",
    view: view,
    content: titleContent,
    expanded: view.widthBreakpoint !== "xsmall",
  });
  view.ui.add(titleExpand, "top-right");

  const template = {
    // autocasts as new PopupTemplate()
    title: "{callsign}",
    content: [
      {
        type: "fields",
        fieldInfos: [
          {
            fieldName: "origin_country",
            label: "Origin country",
          },
          {
            fieldName: "baro_altitude",
            label: "Altitude (meters)",
          },
          {
            fieldName: "true_track",
            label: "Direction (°) (true_track)",
          },
          {
            fieldName: "velocity",
            label: "Speed (m/s)",
          },
          {
            fieldName: "vertical_rate",
            label: "Vertical Rate (m/s)",
          },
        ],
      },
    ],
  };

  // Create a client-side featurelayer
  const featureLayer = new FeatureLayer({
    outFields: ["*"],
    fields: [
      {
        name: "ObjectID",
        alias: "ObjectID",
        type: "oid",
      },
      {
        name: "state",
        alias: "State",
        type: "string",
      },
      {
        name: "icao24",
        alias: "ICAO24",
        type: "string",
      },
      {
        name: "callsign",
        alias: "Call Sign",
        type: "string",
      },
      {
        name: "origin_country",
        alias: "Origin country",
        type: "string",
      },
      {
        name: "last_contact",
        alias: "Last contact (UNIX)",
        type: "integer",
      },
      {
        name: "baro_altitude",
        alias: "Barometric Altitude",
        type: "double",
      },
      {
        name: "on_ground",
        alias: "On the ground",
        type: "string",
      },
      {
        name: "velocity",
        alias: "Speed (m/s)",
        type: "double",
      },
      {
        name: "true_track",
        alias: "Direction",
        type: "double",
      },
      {
        name: "vertical_rate",
        alias: "Vertical Rate (m/s)",
        type: "double",
      },
      {
        name: "geo_altitude",
        alias: "Geometric Altitude",
        type: "double",
      },
      {
        name: "squawk",
        alias: "Squawk",
        type: "string",
      },
      {
        name: "position_source",
        alias: "Position Source",
        type: "integer",
      },
    ],
    popupTemplate: template,
    objectIdField: "ObjectID",
    geometryType: "point",
    hasZ: true,
    spatialReference: { wkid: 4326 },
    source: [],
    elevationInfo: { mode: elevationInfoMode },
    renderer: renderer,
  });
  map.add(featureLayer);

  // Update the Total of planes
  function updateTotal(total) {
    document.getElementById("num-plane-in-the-air-total").innerHTML =
      String(total);
    document.getElementById("updated").style.visibility = "visible";
  }

  // Create the features graphic with the geometry and attributes
  function createGraphics(flightinfos, state, objectId) {
    return new Graphic({
      geometry: new Point({
        x: flightinfos[5] ? flightinfos[5] : 0,
        y: flightinfos[6] ? flightinfos[6] : 0,
        z: exaggeratedHeight * (flightinfos[7] ? flightinfos[7] : 0),
        spatialReference: SpatialReference.WGS84,
      }),
      attributes: {
        ObjectID: objectId,
        state: state,
        icao24: flightinfos[0],
        callsign: flightinfos[1],
        origin_country: flightinfos[2] ? flightinfos[2] : "",
        last_contact: flightinfos[4],
        baro_altitude: flightinfos[7] ? flightinfos[7] : 0,
        on_ground: flightinfos[8] ? flightinfos[8] : "false",
        velocity: flightinfos[9] ? flightinfos[9] : 0,
        true_track: flightinfos[10] ? flightinfos[10] : 0,
        vertical_rate: flightinfos[11] ? flightinfos[11] : 0,
        geo_altitude: flightinfos[13] ? flightinfos[13] : 0,
        squawk: flightinfos[14] ? flightinfos[14] : "",
        position_source: flightinfos[16] ? flightinfos[16] : "",
      },
    });
  }

  // Get the flight position form the https://opensky-network.org API
  function getFlightPosition() {
    const url =
      "https://opensky-network.org/api/states/all?lamin=" +
      extent.ymin +
      "&lomin=" +
      extent.xmin +
      "&lamax=" +
      extent.ymax +
      "&lomax=" +
      extent.xmax;
    esriRequest(url, {
      responseType: "json",
    }).then(function (response) {
      // The requested data
      const flightsinfos = response.data.states;
      featureLayer.queryFeatures().then(function (currentfeatures) {
        updateTotal(currentfeatures.features.length);
        let addfeatures = [];
        let updateFeatures = [];
        let deleteFeatures = [];
        let matchedObjectIdFeatures = [];
        for (let flightinfos of flightsinfos) {
          // only show flight that are in the air
          if (!flightinfos[8]) {
            let matched = false;
            let matchedObjectId = null;
            for (let currentfeature of currentfeatures.features) {
              if (flightinfos[0] === currentfeature.attributes.icao24) {
                matchedObjectId = currentfeature.attributes.ObjectID;
                matchedObjectIdFeatures.push(matchedObjectId);
                matched = true;
                break;
              }
            }
            if (!matched) {
              addfeatures.push(createGraphics(flightinfos, "new", ""));
            } else {
              updateFeatures.push(
                createGraphics(flightinfos, "update", matchedObjectId)
              );
            }
            //console.log("longitude: " + flightinfos[5] + " - latitude: " + flightinfos[6] + " - geo_altitude: " + flightinfos[13] +" - baro_altitude: " + flightinfos[7] + " - vertical_rate: " + flightinfos[11]);
          }
        }
        for (let currentfeature of currentfeatures.features) {
          if (
            !matchedObjectIdFeatures.includes(
              currentfeature.attributes.ObjectID
            )
          ) {
            deleteFeatures.push(currentfeature);
          }
        }
        //console.log("add features: " + addfeatures.length + " - update features: " + updateFeatures.length + " - delete features: " + deleteFeatures.length);
        featureLayer
          .applyEdits({
            addFeatures: addfeatures,
            updateFeatures: updateFeatures,
            deleteFeatures: deleteFeatures,
          })
          .then(function (result) {
            updateTotal(
              result.addFeatureResults.length +
                result.updateFeatureResults.length
            );
          });
      });
    });
  }

  // Setup an Interval to get the flight data
  // Limitations (https://opensky-network.org/apidoc/rest.html#limitations)
  // Anonymous users can only retrieve data with a time resultion of 10 seconds
  let seccounter = 1;
  setInterval(function () {
    seccounter = seccounter - 1;
    document.getElementById("next-update").innerHTML = seccounter.toString();
    document.getElementById("updated").style.visibility = "hidden";
    if (seccounter == 0) {
      getFlightPosition();
      seccounter = 10;
    }
  }, 1000);
});
