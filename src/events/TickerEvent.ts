import Event from "./Event";

export default interface TickerEvent extends Event {
    target: Object;
    type: string;
    paused: boolean;
    delta: number;
    time: number;
    runTime: number;
}