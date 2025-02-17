import { Component, createElement } from "react";
import { LeafletEvent } from "leaflet";

import GoogleMap from "./GoogleMap";
import { LeafletMap } from "./LeafletMap";
import { Container } from "../utils/namespace";
import { fetchData, fetchImageOverlayURL, fetchMarkerObjectUrl, parseStaticLocations } from "../utils/Data";
import Utils from "../utils/Utils";
import { validLocation, validateLocationProps } from "../utils/Validations";
import { hot } from "react-hot-loader";

import "leaflet/dist/leaflet.css";
// Re-uses images from ~leaflet package
// Use workaround for marker icon, that is not standard compatible with webpack
// https://github.com/ghybs/leaflet-defaulticon-compatibility#readme
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "../ui/Maps.css";

type MapsContainerProps = Container.MapsContainerProps;
type MapProps = Container.MapProps;
type Location = Container.Location;
type ImageOverlay = Container.ImageOverlay;
type DataSourceLocationProps = Container.DataSourceLocationProps;

export interface MapsContainerState {
    alertMessage?: string;
    locations: Location[];
    imageOverlays: ImageOverlay[];
    isFetchingData?: boolean;
    isFetchingImageOverlays: boolean;
}

class MapsContainer extends Component<MapsContainerProps, MapsContainerState> {
    private subscriptionHandles: number[] = [];
    readonly state: MapsContainerState = {
        alertMessage: "",
        locations: [],
        imageOverlays: [],
        isFetchingData: false,
        isFetchingImageOverlays : false
    };

    render() {
        const mapsApiToken = this.props.apiToken ? this.props.apiToken.replace(/ /g, "") : undefined;
        const commonProps = {
            ...this.props as MapProps,
            allLocations: this.state.locations,
            allImageOverlays: this.state.imageOverlays,
            fetchingData: this.state.isFetchingData,
            fetchingImageOverlays: this.state.isFetchingImageOverlays,
            className: this.props.class,
            alertMessage: this.state.alertMessage,
            divStyles: Utils.parseStyle(this.props.style),
            onClickMarker: this.onClickMarker,
            onClickContextMenuAction: this.onClickContextMenuAction,
            mapsToken: mapsApiToken,
            inPreviewMode: false,
            ...this.props as Container.ContextMenuProps
        };

        return this.props.mapProvider === "googleMaps"
            ? createElement(GoogleMap, { ...commonProps })
            : createElement(LeafletMap, { ...commonProps });
    }

    UNSAFE_componentWillReceiveProps(nextProps: MapsContainerProps) {
        this.resetSubscriptions(nextProps.mxObject);
        const validationMessage = validateLocationProps(nextProps);
        if (validationMessage) {
            this.setState({ alertMessage: validationMessage });
        } else {
            this.fetchData(nextProps.mxObject);
            this.fetchImageOverlays(nextProps.mxObject);
        }
    }

    componentWillUnmount() {
        this.unsubscribeAll();
    }

    private resetSubscriptions(contextObject?: mendix.lib.MxObject) {
        this.unsubscribeAll();
        if (this.props.locations && this.props.locations.length && contextObject) {
                this.subscriptionHandles.push(window.mx.data.subscribe({
                    guid: contextObject.getGuid(),
                    callback: () => {
                        if (!this.state.isFetchingData === true) {
                            this.fetchData(contextObject);
                        }
                    }
                }));
                this.props.locations.forEach(location => {
                    this.subscriptionHandles.push(window.mx.data.subscribe({
                        entity: location.locationsEntity as string,
                        callback: () => this.fetchData(contextObject)
                    }));
                    [
                        location.latitudeAttribute,
                        location.longitudeAttribute,
                        location.staticMarkerIcon,
                        location.markerImageAttribute
                    ].forEach(attr => this.subscriptionHandles.push(window.mx.data.subscribe({
                            attr,
                            callback: () => this.fetchData(contextObject),
                            guid: contextObject.getGuid()
                        }))
                    );
                });
            }
        }

    private unsubscribeAll() {
        this.subscriptionHandles.forEach(window.mx.data.unsubscribe);
        this.subscriptionHandles = [];
    }

    private fetchData = (contextObject?: mendix.lib.MxObject) => {
        this.setState({ isFetchingData: true });
        Promise.all(this.props.locations.map(locationAttr => this.retrieveData(locationAttr, contextObject)))
            .then(allLocations => {
                const alertMessage: string[] = [];
                const locations = allLocations.reduce((loc1, loc2) => loc1.concat(loc2), [])
                    .filter(location => {
                if (validLocation(location)) {
                            return true;
                        }
                alertMessage.push(`invalid location: latitude '${location.latitude}', longitude '${location.longitude}'`);

                return false;
                    });
                this.setState({
                    locations,
                    isFetchingData: false,
                    alertMessage: alertMessage.join(", ")
                });
            })
            .catch((error: Error) => {
                this.setState({
                    locations: [],
                    alertMessage: error.message,
                    isFetchingData: false
                });
            });
    }

    private retrieveData(locationOptions: DataSourceLocationProps, contextObject?: mendix.lib.MxObject): Promise<Location[]> {
        const { dataSourceType, entityConstraint } = locationOptions;
        const requiresContext = dataSourceType === "microflow" || dataSourceType === "nanoflow"
            || (dataSourceType === "XPath" && entityConstraint.indexOf("[%CurrentObject%]") !== -1);

        if (dataSourceType === "static") {
            const staticLocation = parseStaticLocations([ locationOptions ]);

            return Promise.resolve(staticLocation);
        }
        if (dataSourceType === "context") {
            if (contextObject) {
                return this.setLocationsFromMxObjects([ contextObject ], locationOptions);
            }

            return Promise.resolve([]);
        }
        if (contextObject || !requiresContext) {
            return fetchData({
                    type: dataSourceType,
                    entity: locationOptions.locationsEntity,
                    constraint: entityConstraint,
                    microflow: locationOptions.dataSourceMicroflow,
                    mxform: this.props.mxform,
                    nanoflow: locationOptions.dataSourceNanoflow,
                    contextObject,
                    inputParameterEntity: locationOptions.inputParameterEntity,
                    requiresContext
                })
                .then(mxObjects => this.setLocationsFromMxObjects(mxObjects, locationOptions));
        }

        return Promise.resolve([]);
    }

    private setLocationsFromMxObjects(mxObjects: mendix.lib.MxObject[] | null, locationAttr: DataSourceLocationProps): Promise<Location[]> {
        if (!mxObjects) {
            return Promise.resolve([]);
        }

        return Promise.all(mxObjects.map(mxObject =>
            fetchMarkerObjectUrl({
                type: locationAttr.markerImage,
                markerIcon: locationAttr.staticMarkerIcon,
                imageAttribute: locationAttr.markerImageAttribute,
                systemImagePath: locationAttr.systemImagePath,
                markerEnumImages: this.props.markerImages
            }, mxObject)
            .then(markerUrl => {
                return {
                    latitude: Number(mxObject.get(locationAttr.latitudeAttribute)),
                    longitude: Number(mxObject.get(locationAttr.longitudeAttribute)),
                    mxObject,
                    url: markerUrl,
                    locationAttr
                };
            })
        ));
    }

    private onClickMarker = (event: LeafletEvent & google.maps.MouseEvent, locationAttr: DataSourceLocationProps) => {
        const { locations } = this.state;
        const latitude = this.props.mapProvider === "googleMaps" ? event.latLng.lat() : event.target.getLatLng().lat;
        this.executeAction(locations[locations.findIndex(targetLoc => targetLoc.latitude === latitude)].mxObject, locationAttr);
    }

    private onClickContextMenuAction = (action: Container.ContextMenuAction, latitude?: number, longitude?: number): void => {
        const object = this.props.mxObject;
        if (object && object.getEntity() === action.inputParameterEntity) {

            if (action.latitudeAttribute && latitude) {
                object.set(action.latitudeAttribute, latitude.toFixed(8));
            }
            if (action.longitudeAttribute && longitude) {
                object.set(action.longitudeAttribute, longitude.toFixed(8));
            }
        }
        this.executeAction(object, action);
    }

    private executeAction = (object: mendix.lib.MxObject | undefined, eventProps: Container.EventProps) => {

        if (object) {
            const { mxform } = this.props;
            const { onClickEvent, onClickMicroflow, onClickNanoflow, openPageAs, page } = eventProps;
            const context = new mendix.lib.MxContext();
            context.setContext(object.getEntity(), object.getGuid());

            if (onClickEvent === "callMicroflow" && onClickMicroflow) {
                mx.ui.action(onClickMicroflow, {
                    context,
                    origin: mxform,
                    error: error => mx.ui.error(`Error while executing on click microflow ${onClickMicroflow} : ${error.message}`)
                });
            } else if (onClickEvent === "callNanoflow" && onClickNanoflow.nanoflow) {
                window.mx.data.callNanoflow({
                    nanoflow: onClickNanoflow,
                    origin: mxform,
                    context,
                    error: error => {
                        logger.error(`${this.props.friendlyId}: Error while executing on click nanoflow: ${error.message}`);
                        mx.ui.error(`Error while executing on click nanoflow: ${error.message}`);
                    }
                });
            } else if (onClickEvent === "showPage" && page) {
                window.mx.ui.openForm(page, {
                    location: openPageAs,
                    context,
                    error: error => {
                        logger.error(`${this.props.friendlyId}: Error while opening page ${page}: ${error.message}`);
                        mx.ui.error(`Error while opening page ${page}: ${error.message}`);
                    }
                });
            }
        }
    }

    private fetchImageOverlays = (contextObject?: mendix.lib.MxObject) => {
        this.setState({ isFetchingImageOverlays: true });
        Promise.all(this.props.imageOverlays.map(overlay => this.retrieveImageOverlays(overlay, contextObject)))
            .then(imageOverlays => imageOverlays.reduce((o1, o2) => o1.concat(o2), []))
            .then(imageOverlays => {
                this.setState({
                    imageOverlays,
                    isFetchingImageOverlays: false
                });
            });

    }

    private retrieveImageOverlays(dataSourceProps: Container.DataSourceImageOverlayProps, contextObject?: mendix.lib.MxObject): Promise<ImageOverlay[]> {

        if (dataSourceProps.dataSourceType === "static") {
            return fetchImageOverlayURL(dataSourceProps)
                .then(imageUrl => {
                    return [ {
                        latitudeTop: Number(dataSourceProps.staticLatitudeTop),
                        longitudeLeft: Number(dataSourceProps.staticLongitudeLeft),
                        latitudeBottom: Number(dataSourceProps.staticLatitudeBottom),
                        longitudeRight: Number(dataSourceProps.staticLongitudeRight),
                        url: imageUrl,
                        opacity: Number(dataSourceProps.staticOpacity ? dataSourceProps.staticOpacity : 0)
                    } ];
                }
            );
        } else {

            return fetchData({
                type: dataSourceProps.dataSourceType,
                entity: dataSourceProps.imageOverlayEntity,
                mxform: this.props.mxform,
                constraint: dataSourceProps.entityConstraint,
                microflow: dataSourceProps.dataSourceMicroflow,
                nanoflow: dataSourceProps.dataSourceNanoflow,
                contextObject,
                inputParameterEntity: dataSourceProps.inputParameterEntity,
                requiresContext: false
            }).then(mxObjects => Promise.all(mxObjects.map(mxObjectToOverlay)));
        }

        function mxObjectToOverlay(mxObject: mendix.lib.MxObject): Promise<ImageOverlay> {
            return fetchImageOverlayURL(dataSourceProps, mxObject)
            .then(imageUrl => {

                return {
                    latitudeTop: Number(mxObject.get(dataSourceProps.latitudeTopAttribute)),
                    longitudeLeft: Number(mxObject.get(dataSourceProps.longitudeLeftAttribute)),
                    latitudeBottom: Number(mxObject.get(dataSourceProps.latitudeBottomAttribute)),
                    longitudeRight: Number(mxObject.get(dataSourceProps.longitudeRightAttribute)),
                    url: imageUrl,
                    opacity: Number(dataSourceProps.opacity ? dataSourceProps.opacity : 0)
                };
            });
        }
    }
}

export default hot(module)(MapsContainer);
