// Definiáld a mezők típusait egy objektumban
const fieldTypes = {
    camera: [
        { name: "SensorSize", type: "number" },
        { name: "LensMount", type: "string" },
        { name: "MinimumIso", type: "number" },
        { name: "MaximumIso", type: "number" },
        { name: "MinimumShutter", type: "number" },
        { name: "MaximumShutter", type: "number" },
        { name: "ImageStabilization", type: "boolean" },
        { name: "AutofocusPoints", type: "number" },
        { name: "LcdScreenSize", type: "number" },
        { name: "Weight", type: "number" },
        { name: "WifiSupport:", type: "boolean" },
        { name: "BluetoothSupport:", type: "boolean" },
        { name: "Resolutions:", type: "array", options: ["4K", "FULLHD"] },
        { name: "StereoInput", type: "boolean" },
        { name: "StorageSupport",type: "array", options: ["SSD", "SD"] },
        { name: "ConnectorType", type: "boolean" },
    ],
    lens: [
        { name: "focalLength", type: "number" },
        { name: "aperture", type: "number" },
        { name: "hasImageStabilization", type: "boolean" }
    ],
};

export default fieldTypes;
