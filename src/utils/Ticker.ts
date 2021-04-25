import Event from "../events/Event";
import EventDispatcher from "../events/EventDispatcher";

declare const enum TimingMode {
    RAF_SYNCHED = "synched",
    RAF = "raf",
    TIMEOUT = "timeout"
}

export default class Ticker extends EventDispatcher {
    public timingMode: TimingMode = TimingMode.TIMEOUT;
    public maxDelta = 0;
    public paused = false;

    private _inited: boolean = false;
    private _startTime: number = 0;
    private _pausedTime: number = 0;
    private _ticks: number = 0;
    private _pausedTicks: number = 0;
    private _interval: number = 50;
    private _lastTime: number = 0;
    private _times: number[] = [];
    private _tickTimes: number[] = [];
    private _timerId: number|null = null;
    private _raf: boolean = true;

    constructor() {
        super();
    }

    private set interval(interval: number) {
        this._interval = interval;
        if (!this._inited) {
            return;
        }
        this._setupTick();
    }

    private get interval(): number {
        return this._interval;
    }


    private set framerate(value: number) {
        this.interval = 1000/value;
    }

    private get framerate(): number {
        return 1000/this._interval;
    }

    private init() {
        if (this._inited) {
            return;
        }
        this._inited = true;
        this._times = [];
        this._tickTimes = [];
        this._startTime = this.time;
        this._times.push(this._lastTime = 0);
        this.interval = this._interval;
    }

    private reset() {
        if(!this._timerId) return;

        if (this._raf) {
            cancelAnimationFrame && cancelAnimationFrame(this._timerId);
        } else {
            clearTimeout(this._timerId);
        }
        this.removeAllEventListeners("tick");
        this._timerId = null;
        this._times = []; this._tickTimes = [];
        this._startTime = this._lastTime = this._ticks = this._pausedTime = 0;
        this._inited = false;
    }

    private getMeasuredTickTime(ticks?: number): number {
        let ttl=0, times=this._tickTimes;
        if (!times || times.length < 1) { return -1; }

        // by default, calculate average for the past ~1 second:
        ticks = Math.min(times.length, ticks||(this.framerate|0));
        for (let i=0; i<ticks; i++) {
            ttl += times[i];
        }
        return ttl/ticks;
    }

    private getMeasuredFPS(ticks?: number): number {
        const times = this._times;
        if (!times || times.length < 2) { return -1; }

        // by default, calculate fps for the past ~1 second:
        ticks = Math.min(times.length-1, ticks||(this.framerate|0));
        return 1000/((times[0]-times[ticks])/ticks);
    }

    private getTime(runTime: boolean = false): number {
        return this._startTime ? this.time - (runTime ? this._pausedTime : 0) : -1;
    }

    private getEventTime (runTime: boolean = false): number {
        return this._startTime ? (this._lastTime || this._startTime) - (runTime ? this._pausedTime : 0) : -1;
    }

    private getTicks (pauseable: boolean = false) {
        return  this._ticks - (pauseable ? this._pausedTicks : 0);
    }

    private _handleSynch() {
        this._timerId = null;
        this._setupTick();

        // run if enough time has elapsed, with a little bit of flexibility to be early:
        if (this.time - this._lastTime >= (this._interval-1)*0.97) {
            this._tick();
        }
    }

    private _handleRAF() {
        this._timerId = null;
        this._setupTick();
        this._tick();
    }

    private _handleTimeout() {
        this._timerId = null;
        this._setupTick();
        this._tick();
    }


    private _setupTick() {
        if (this._timerId != null) { return; } // avoid duplicates

        const mode = this.timingMode;
        if (mode === TimingMode.RAF_SYNCHED || mode === TimingMode.RAF) {
            if (requestAnimationFrame) {
                this._timerId = requestAnimationFrame(mode === TimingMode.RAF ? this._handleRAF.bind(this) : this._handleSynch.bind(this));
                this._raf = true;
                return;
            }
        }
        this._raf = false;
        this._timerId = setTimeout(this._handleTimeout.bind(this), this._interval);
    }

    private _tick() {
        const paused = this.paused;
        const time = this.time;
        const elapsedTime = time-this._lastTime;
        this._lastTime = time;
        this._ticks++;

        if (paused) {
            this._pausedTicks++;
            this._pausedTime += elapsedTime;
        }

        if (this.hasEventListener("tick")) {
            const event: Event = new Event("tick");
            const maxDelta = this.maxDelta;
            event.delta = (maxDelta && elapsedTime > maxDelta) ? maxDelta : elapsedTime;
            event.paused = paused;
            event.time = time;
            event.runTime = time-this._pausedTime;
            this.dispatchEvent(event);
        }

        this._tickTimes.unshift(this.time-time);
        while (this._tickTimes.length > 100) { this._tickTimes.pop(); }

        this._times.unshift(time);
        while (this._times.length > 100) { this._times.pop(); }
    }

    private get time() {
        const now = window.performance && window.performance.now;
        return ((now&&now.call(window.performance))||(new Date().getTime())) - this._startTime;
    }



    static on(type: string, listener: EventListenerObject | any , scope: any = null, once: boolean = false, data: any = null, useCapture: boolean = false): Function {
        return _instance.on(type, listener, scope, once, data, useCapture);
    }

    static removeEventListener(type: string, listener: any, useCapture: boolean = false) {
        _instance.removeEventListener(type, listener, useCapture);
    }

    static off (type: string, listener: any, useCapture: boolean = false) {
        _instance.off(type, listener, useCapture);
    }

    static removeAllEventListeners(type: string) {
        _instance.removeAllEventListeners(type);
    }

    static dispatchEvent(eventObj: string | Event, bubbles: boolean = false, cancelable: boolean = false): boolean {
        return _instance.dispatchEvent(eventObj, bubbles, cancelable);
    }

    static hasEventListener(type: string): boolean {
        return _instance.hasEventListener(type);
    }

    static willTrigger(type: string): boolean {
        return _instance.willTrigger(type);
    }

    static toString () {
        return _instance.toString();
    }

    static init () {
        _instance.init();
    }

    static reset () {
        _instance.reset();
    }

    static addEventListener(type: string, listener: EventListenerObject | any, useCapture: boolean = false): any {
        _instance.addEventListener(type, listener, useCapture);
    }

    static getMeasuredTickTime (ticks: number): number {
        return _instance.getMeasuredTickTime(ticks);
    }

    static getMeasuredFPS (ticks?: number): number {
        return _instance.getMeasuredFPS(ticks);
    }

    static getTime (runTime?: boolean): number {
        return _instance.getTime(runTime);
    }

    static getEventTime (runTime?: boolean) {
        return _instance.getEventTime(runTime);
    }

    static getTicks (pauseable?: boolean) {
        return _instance.getTicks(pauseable);
    }

    static get interval(): number {
        return _instance.interval;
    }

    static set interval(interval: number) {
        _instance.interval = interval;
    }

    static get framerate(): number {
        return _instance.framerate;
    }

    static set framerate (framerate) {
        _instance.framerate = framerate;
    }
    // static get name(): string { return _instance.name; }
    // static set name(name: string) { _instance.name = name; }
    static get timingMode(): TimingMode {
        return _instance.timingMode;
    }

    static set timingMode (timingMode: TimingMode) {
        _instance.timingMode = timingMode;
    }

    static get maxDelta(): number {
        return _instance.maxDelta;
    }

    static set maxDelta(maxDelta: number) {
        _instance.maxDelta = maxDelta;
    }

    static get paused(): boolean {
        return _instance.paused;
    }

    static set paused(paused: boolean) {
        _instance.paused = paused;
    }

    static get RAF_SYNCHED () { return TimingMode.RAF_SYNCHED; }
    static get RAF () { return TimingMode.RAF; }
    static get TIMEOUT () { return TimingMode.TIMEOUT; }

}

const _instance: Ticker = new Ticker();