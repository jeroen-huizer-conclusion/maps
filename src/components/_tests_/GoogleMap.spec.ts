import { mount, shallow } from "enzyme";
import { createElement } from "react";
import ReactResizeDetector from "react-resize-detector";

import { Alert } from "../../components/Alert";
import { GoogleMap, GoogleMapsProps } from "../GoogleMap";

import { mockGoogleMaps } from "../../../tests/mocks/GoogleMaps";

describe("Google maps", () => {
    const defaultProps: GoogleMapsProps = {
        autoZoom: true,
        defaultCenterLatitude: "",
        defaultCenterLongitude: "",
        height: 75,
        heightUnit: "pixels",
        scriptsLoaded: true,
        optionDrag: true,
        optionScroll: true,
        optionZoomControl: true,
        zoomLevel: 10,
        width: 50,
        widthUnit: "percentage",
        mapStyles: "",
        divStyles: {},
        mapProvider: "googleMaps",
        mapType: "",
        inPreviewMode: false
    };

    beforeAll(() => {
        window.google = mockGoogleMaps;
    });

    const renderGoogleMap = (props: GoogleMapsProps) => shallow(createElement(GoogleMap, props));
    const fullRenderGoogleMap = (props: GoogleMapsProps) => mount(createElement(GoogleMap, props));

    it("renders structure correctly", () => {
        const googleMaps = renderGoogleMap(defaultProps);
        const mapStyle = { width: "50px", height: "37.5px" };
        googleMaps.setProps({
            heightUnit: "percentageOfWidth",
            widthUnit: "pixels"
        });

        expect(googleMaps).toBeElement(
            createElement("div", { className: "widget-maps", style: mapStyle },
                createElement(Alert, { className: "widget-google-maps-alert" }),
                createElement("div", { className: "widget-google-maps-wrapper" },
                    createElement("div", { className: "widget-google-maps" })
                ),
                createElement(ReactResizeDetector)
            )
        );
    });

    it("with pixels renders structure correctly", () => {
        const googleMaps = renderGoogleMap(defaultProps);
        const mapStyle = { width: "50px", height: "75px" };
        googleMaps.setProps({
            heightUnit: "pixels",
            widthUnit: "pixels"
        });

        expect(googleMaps).toBeElement(
            createElement("div", { className: "widget-maps", style: mapStyle },
                createElement(Alert, { className: "widget-google-maps-alert" }),
                createElement("div", { className: "widget-google-maps-wrapper" },
                    createElement("div", { className: "widget-google-maps" })
                ),
                createElement(ReactResizeDetector)
            )
        );
    });

    it("with percentage of width and height units renders the structure correctly", () => {
        const googleMaps = renderGoogleMap(defaultProps);
        const mapStyle = { width: "50%", paddingBottom: "37.5%", height: "auto" };
        googleMaps.setProps({
            heightUnit: "percentageOfWidth",
            widthUnit: "percentage"
        });

        expect(googleMaps).toBeElement(
            createElement("div", { className: "widget-maps", style: mapStyle },
                createElement(Alert, { className: "widget-google-maps-alert" }),
                createElement("div", { className: "widget-google-maps-wrapper" },
                    createElement("div", { className: "widget-google-maps" })
                ),
                createElement(ReactResizeDetector)
            )
        );
    });

    it("with percentage of parent units renders the structure correctly", () => {
        const googleMaps = renderGoogleMap(defaultProps);
        const mapStyle = { width: "50%", height: "75%" };
        googleMaps.setProps({
            heightUnit: "percentageOfParent",
            widthUnit: "percentage"
        });

        expect(googleMaps).toBeElement(
            createElement("div", { className: "widget-maps", style: mapStyle },
                createElement(Alert, { className: "widget-google-maps-alert" }),
                createElement("div", { className: "widget-google-maps-wrapper" },
                    createElement("div", { className: "widget-google-maps" })
                ),
                createElement(ReactResizeDetector)
            )
        );
    });

    it("without default center Latitude and Longitude sets default center location based on the default configured location", () => {
        const googleMaps = fullRenderGoogleMap(defaultProps);
        googleMaps.setProps({
            fetchingData: false
        });
        expect(googleMaps.state("center")).toEqual({ lat: 51.9066346, lng: 4.4861703 });
    });

    it("creates markers from given locations", () => {
        const customProps = {
            ...defaultProps,
            allLocations: [ { latitude: 40.759011, longitude: -73.9844722, mxObject: undefined, url: "http://dummy.url" } ],
            fetchingData: false,
            autoZoom: false
        };
        const googleMaps = fullRenderGoogleMap(defaultProps);
        const googleMapsInstance = googleMaps.instance() as any;
        const createMarkerSpy = spyOn(googleMapsInstance, "addMarkers").and.callThrough();

        googleMapsInstance.componentWillReceiveProps(customProps);

        expect(createMarkerSpy).toHaveBeenCalledWith(customProps.allLocations);
    });

    it("creates an imageoverlay at a given location with a url", () => {
        const customProps = {
            ...defaultProps,
            allImageOverlays: [ { latitudeTop: 0, longitudeLeft: 0, latitudeBottom: 0, longitudeRight: 0, url: "" } ],
            fetchingImageOverlay: false
        };

        const googleMaps = fullRenderGoogleMap(defaultProps);
        const googleMapsInstance = googleMaps.instance() as any;
        const createOverlaySpy = spyOn(googleMapsInstance, "renderImageOverlays").and.callThrough();

        googleMapsInstance.componentWillReceiveProps(customProps);

        expect(createOverlaySpy).toHaveBeenCalled();
    });

    afterAll(() => {
        window.google = undefined;
    });
});
