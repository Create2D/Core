import Event from "./Event";

type Listener = Function | ((event?: Object) => boolean|void) | { handleEvent: ((event?: Object) => boolean|void) };

export default class EventDispatcher {

    protected listeners: {[key: string]: EventListenerObject[]} | null = null;
    protected captureListeners: {[key: string]: any[]} | null = null;

    public static initialize(target: any) {
        const p = new EventDispatcher();
        target.addEventListener = p.addEventListener;
        target.on = p.on;
        target.removeEventListener = target.off =  p.removeEventListener;
        target.removeAllEventListeners = p.removeAllEventListeners;
        target.hasEventListener = p.hasEventListener;
        target.dispatchEvent = p.dispatchEvent;
        target._dispatchEvent = p._dispatchEvent;
        target.willTrigger = p.willTrigger;
    }

    public addEventListener(type: string, listener: Listener, useCapture: boolean = false): Function|Object {
        let listeners: {[key: string]: object[]};
        if (useCapture) {
            listeners = this.captureListeners = this.captureListeners || {};
        } else {
            listeners = this.listeners = this.listeners || {};
        }
        let arr = listeners[type];
        if (arr) {
            this.removeEventListener(type, listener, useCapture);
            arr = listeners[type];
        }
        if (!arr) {
            listeners[type] = [listener];
        } else {
            arr.push(listener);
        }
        return listener;
    }

    public on(type: string, listener: Listener, scope?: Object, once?: boolean, data?: any, useCapture?: boolean): Function;
    public on(type: string, listener: any, scope: any = null, once: boolean = false, data: any = null, useCapture: boolean = false): Function|Object {
        if (listener.handleEvent) {
            scope = scope || listener;
            listener = listener.handleEvent;
        }
        scope = scope || this;
        return this.addEventListener(type, (evt: any) => {
            listener.call(scope, evt, data);
            once&&evt.remove();
        }, useCapture);
    }

    public removeEventListener(type: string, listener: Listener|Function, useCapture: boolean = false) {
        const listeners = useCapture ? this.captureListeners : this.listeners;
        if (!listeners) {
            return;
        }
        let arr = listeners[type];
        if (!arr) {
            return;
        }
        for (let i=0, l=arr.length; i<l; i++) {
            if (arr[i] === listener) {
                if (l===1) {
                    delete(listeners[type]); // allows for faster checks.
                }  else {
                    arr.splice(i,1);
                }
                break;
            }
        }
    }
    public off = this.removeEventListener;

    public removeAllEventListeners(type: string) {
        if (!type) {
            this.listeners = this.captureListeners = null;
        }
        else {
            if (this.listeners) {
                delete(this.listeners[type]);
            }
            if (this.captureListeners) {
                delete(this.captureListeners[type]);
            }
        }
    }

    public dispatchEvent(eventObj: Event|string, bubbles: boolean = false, cancelable: boolean = false): boolean{
        if (typeof eventObj == "string") {
            // skip everything if there's no listeners and it doesn't bubble:
            const listeners = this.listeners;
            if (!bubbles && (!listeners || !listeners[eventObj])) {
                return true;
            }
            eventObj = new Event(eventObj, bubbles, cancelable);
        } else if (eventObj.target && eventObj.clone) {
            // redispatch an active event object, so clone it:
            eventObj = eventObj.clone();
        }

        eventObj.target = this;
        let o = this as any;
        if (!eventObj.bubbles || !o.parent) {
            this._dispatchEvent(eventObj, 2);
        } else {
            let top = o, list = [top];
            while (top.parent) {
                list.push(top = top.parent);
            }
            let i, l = list.length;

            // capture & atTarget
            for (i = l - 1; i >= 0 && !eventObj.propagationStopped; i--) {
                list[i]._dispatchEvent(eventObj, 1 + (i == 0 ? 1 : 0));
            }
            // bubbling
            for (i = 1; i < l && !eventObj.propagationStopped; i++) {
                list[i]._dispatchEvent(eventObj, 3);
            }
        }
        return !eventObj.defaultPrevented;
    }

    public hasEventListener(type: string): boolean {
        const listeners = this.listeners, captureListeners = this.captureListeners;
        return !!((listeners && listeners[type]) || (captureListeners && captureListeners[type]));
    }

    public willTrigger(type: string): boolean {
        let o = this as any;
        while (o) {
            if (o.hasEventListener(type)) {
                return true;
            }
            o = o.parent;
        }
        return false;
    }

    public toString(): string {
        return "[EventDispatcher]";
    }

    private _dispatchEvent (eventObj: Event, eventPhase: number) {
        let l, arr, listeners = (eventPhase <= 2) ? this.captureListeners : this.listeners;
        if (eventObj && listeners && (arr = listeners[eventObj.type]) && (l=arr.length)) {
            try { eventObj.currentTarget = this; } catch (e) {}
            try { eventObj.eventPhase = eventPhase|0; } catch (e) {}
            eventObj.removed = false;

            arr = arr.slice(); // to avoid issues with items being removed or added during the dispatch
            for (let i=0; i<l && !eventObj.immediatePropagationStopped; i++) {
                const o = arr[i];
                if (o.handleEvent) {
                    o.handleEvent(eventObj);
                } else {
                    o(eventObj);
                }
                if (eventObj.removed) {
                    this.off(eventObj.type, o, eventPhase==1);
                    eventObj.removed = false;
                }
            }
        }
        if (eventPhase === 2) {
            this._dispatchEvent(eventObj, 2.1);
        }
    }
}