export namespace Container {

    export type MarKerImages = "systemImage" | "staticImage" | "enumImage";
    export type OverlayImages = "systemImage" | "urlImage";
    export type DataSource = "static" | "XPath" | "microflow" | "context" | "nanoflow";
    export type OnClickOptions = "doNothing" | "showPage" | "callMicroflow" | "callNanoflow";
    export type PageLocation = "content" | "popup" | "modal";
    export type mapProviders = "openStreet" | "mapBox" | "hereMaps" | "googleMaps";

    export interface WrapperProps {
        "class"?: string;
        friendlyId: string;
        mxform: mxui.lib.form._FormBase;
        mxObject?: mendix.lib.MxObject;
        style?: string;
    }

    export interface MapsContainerProps extends WrapperProps, MapProps {
        locations: DataSourceLocationProps[];
        markerImages: EnumerationImages[];
        imageOverlays: DataSourceImageOverlayProps[];
    }

    export interface DataSourceLocationProps extends DatabaseLocationProps, StaticLocationProps, MarkerIconProps, MarkerEvents {
        dataSourceType: DataSource;
        locationsEntity: string;
        entityConstraint: string;
        dataSourceMicroflow: string;
        dataSourceNanoflow: Data.Nanoflow;
        inputParameterEntity: string;
    }

    export interface DatabaseLocationProps {
        latitudeAttribute: string;
        longitudeAttribute: string;
    }

    export interface StaticLocationProps {
        staticLatitude: string;
        staticLongitude: string;
    }

    export interface Location {
        latitude: number;
        longitude: number;
        mxObject?: mendix.lib.MxObject;
        url?: string;
        locationAttr?: Container.DataSourceLocationProps;
    }

    export interface DataSourceImageOverlayProps extends DataBaseImageOverlayProps, StaticImageOverlayProps {
        dataSourceType: DataSource;
        overlayImage: OverlayImages;

        imageOverlayEntity: string;

        entityConstraint: string;
        dataSourceMicroflow: string;
        dataSourceNanoflow: Data.Nanoflow;
        inputParameterEntity: string;
    }

    export interface DataBaseImageOverlayProps {

        latitudeTopAttribute: string;
        longitudeLeftAttribute: string;
        latitudeBottomAttribute: string;
        longitudeRightAttribute: string;

        opacity: string;
        urlAttribute: string;
    }

    export interface StaticImageOverlayProps {
        staticOverlayImage: string;
        staticOpacity: string;

        staticLatitudeTop: string;
        staticLongitudeLeft: string;
        staticLatitudeBottom: string;
        staticLongitudeRight: string;
    }

    export interface ImageOverlay {

        latitudeTop: number;
        longitudeLeft: number;
        latitudeBottom: number;
        longitudeRight: number;
        url: string;
        opacity: number;
    }

    export interface DefaultLocations {
        defaultCenterLatitude: string;
        defaultCenterLongitude: string;
    }

    export interface MarkerIconProps {
        markerImage: MarKerImages;
        staticMarkerIcon: string;
        systemImagePath: string;
        markerImageAttribute: string;
    }

    export interface MarkerEvents {
        onClickMicroflow: string;
        onClickNanoflow: Data.Nanoflow;
        onClickEvent: OnClickOptions;
        openPageAs: PageLocation;
        page: string;
    }

    export interface MapControlOptions {
        optionDrag?: boolean;
        optionScroll?: boolean;
        optionZoomControl?: boolean;
        attributionControl?: boolean;
        optionStreetView?: boolean;
        mapTypeControl?: boolean;
        fullScreenControl?: boolean;
        rotateControl?: boolean;
        mapStyles?: string;
    }

    export interface EnumerationImages {
        enumKey: string;
        enumImage: string;
    }

    export interface MapProps extends MapControlOptions, DefaultLocations, MapUtils.Dimensions {
        mapProvider: mapProviders;
        mapType: string;
        apiToken?: string;
    }
}

export namespace Data {

    export interface FetchDataOptions {
        type: Container.DataSource;
        entity?: string;
        guid?: string;
        mxform: mxui.lib.form._FormBase;
        constraint?: string;
        microflow?: string;
        nanoflow: Nanoflow;
        contextObject?: mendix.lib.MxObject;
        inputParameterEntity: string;
        requiresContext: boolean;
    }

    export interface FetchByXPathOptions {
        guid?: string;
        entity: string;
        constraint: string;
    }
    export interface Nanoflow {
        nanoflow: object[];
        paramsSpec: { Progress: string };
    }

    export interface FetchMarkerIcons {
        type: Container.MarKerImages;
        markerIcon: string;
        imageAttribute: string;
        markerEnumImages: Container.EnumerationImages[];
        systemImagePath: string;
    }
}

export namespace MapUtils {

    export interface SharedProps {
        allLocations?: Container.Location[];
        allImageOverlays?: Container.ImageOverlay[];
        className?: string;
        alertMessage?: string;
        fetchingData?: boolean;
        fetchingImageOverlays?: boolean;
        divStyles: object;
        mapsToken?: string;
        inPreviewMode: boolean;
    }

    export type heightUnitType = "percentageOfWidth" | "percentageOfParent" | "pixels";
    export type widthUnitType = "percentage" | "pixels";

    export interface Dimensions {
        autoZoom?: boolean;
        zoomLevel: number;
        widthUnit: widthUnitType;
        width: number;
        height: number;
        heightUnit: heightUnitType;
    }

    export interface CustomTypeUrls {
        readonly openStreetMap: string;
        readonly mapbox: string;
        readonly hereMaps: string;
    }

    export interface MapAttributions {
        readonly openStreetMapAttr: string;
        readonly mapboxAttr: string;
        readonly hereMapsAttr: string;
    }
}
