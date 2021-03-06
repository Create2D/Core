
/**
 * Contains properties and methods shared by all events for use with {@link EventDispatcher}.
 * Note that Event objects are often reused, so you should never
 * rely on an event object's state outside of the call stack it was received in.
 **/
export default class Event {

    /**
     * Indicates whether the event will bubble through the display list.
     **/
    bubbles: boolean;

    /**
     * Indicates whether the default behaviour of this event can be cancelled via {@link Event#preventDefault}.
     **/
    cancelable: boolean;

    /**
     * The current target that a bubbling event is being dispatched from.
     * For non-bubbling events, this will always be the same as target.
     * For example, if childObj.parent = parentObj, and a bubbling event is generated from childObj,
     * then a listener on parentObj would receive the event with target=childObj (the original target)
     * and currentTarget=parentObj (where the listener was added).
     **/
    currentTarget: any = null;

    /**
     * Indicates if {@link Event#preventDefault} has been called on this event.
     **/
    defaultPrevented: boolean = false;

    /**
     * For bubbling events, this indicates the current event phase:
     * <OL>
     *    <LI> capture phase: starting from the top parent to the target</LI>
     *    <LI> at target phase: currently being dispatched from the target</LI>
     *    <LI> bubbling phase: from the target to the top parent</LI>
     * </OL>
     **/
    eventPhase: number = 0;

    /**
     * Indicates if {@link Event#stopImmediatePropagation} has been called on this event.
     **/
    immediatePropagationStopped: boolean = false;

    /**
     * Indicates if {@link Event#stopPropagation} or {@link Event#stopImmediatePropagation} has been called on this event.
     **/
    propagationStopped: boolean = false;

    /**
     * Indicates if {@link Event#remove} has been called on this event.
     */
    removed: boolean = false;

    /**
     * The object that generated an event.
     **/
    target: any = null;

    /**
     * The epoch time at which this event was created.
     **/
    timeStamp: number;

    /**
     * The type of event.
     **/
    type: string;

    // other event payloads
    data?: any;
    delta?: number;
    error?: string;
    id?: string;
    item?: any;
    loaded?: number;
    name?: string;
    next?: string;
    params?: any;
    paused?: boolean;
    progress?: number;
    rawResult?: any;
    result?: any;
    runTime?: number;
    src?: string;
    time?: number;
    total?: number;

    constructor(type: string, bubbles: boolean = false, cancelable: boolean = false) {
        this.type = type;
        this.bubbles = bubbles;
        this.cancelable = cancelable;

        this.timeStamp = Date.now();
    }

    public preventDefault(): Event {
        this.defaultPrevented = this.cancelable;
        return this;
    }

    public stopImmediatePropagation(): Event {
        this.immediatePropagationStopped = this.propagationStopped;
        return this;
    }

    public stopPropagation(): Event {
        this.propagationStopped = true;
        return this;
    }

    public remove(): Event {
        this.removed = true;
        return this;
    }

    public clone(): Event {
        return (new Event(this.type, this.bubbles, this.cancelable)).set(this);
    }

    public set(props: { [k: string]: any }): Event {
        for (let n in props) {
            (this as { [k: string]: any })[n] = props[n];
        }
        return this;
    }

    public toString(): string {
        return `[Event (type=${this.type})]`;
    }
}