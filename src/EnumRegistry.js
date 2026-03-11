/**
 * EnumRegistry — global store for user-defined enum types.
 *
 * Each enum maps a name (the "type" identifier used across the system) to an
 * ordered array of { value: number, label: string } entries.  The integer
 * `value` is what the firmware stores / transmits; the `label` is what the UI
 * displays instead.
 *
 * Dispatches a `change` event on itself whenever the registry mutates so that
 * UIUnit option lists and any other subscribers can stay in sync without tight
 * coupling.
 *
 * Exposed on `window.EnumRegister` so it is accessible without imports from
 * global event handlers and inline scripts.
 */
export default class EnumRegistry extends EventTarget {
    #enums = {}

    /** Ordered list of all registered enum names. */
    get names() { return Object.keys(this.#enums) }

    /** Returns true when `name` is a registered enum type. */
    isEnum(name) { return name != null && name in this.#enums }

    /**
     * Returns a shallow copy of the entry array for `name`, or undefined if the
     * enum does not exist.
     */
    getEnum(name) {
        return this.#enums[name] ? [...this.#enums[name]] : undefined
    }

    /**
     * Looks up the display label for a given raw integer value inside an enum.
     * Returns undefined when the value is not mapped.
     */
    labelForValue(enumName, value) {
        const num = Number(value)
        return this.#enums[enumName]?.find(e => e.value === num)?.label
    }

    /**
     * Creates or completely replaces the entry list for `name`.
     * `entries` must be an array of { value: number, label: string }.
     */
    setEnum(name, entries) {
        if (!name || !Array.isArray(entries)) return
        this.#enums[name] = entries.map(e => ({
            value: Number(e.value),
            label: String(e.label ?? ``)
        }))
        this.dispatchEvent(new Event(`change`))
    }

    /** Removes the enum entirely.  No-op when the name is not registered. */
    deleteEnum(name) {
        if (!(name in this.#enums)) return
        delete this.#enums[name]
        this.dispatchEvent(new Event(`change`))
    }

    /**
     * Renames an enum, preserving its entries.
     * Any existing record under `newName` is overwritten.
     */
    renameEnum(oldName, newName) {
        if (!oldName || !newName || !(oldName in this.#enums) || oldName === newName) return
        this.#enums[newName] = this.#enums[oldName]
        delete this.#enums[oldName]
        this.dispatchEvent(new Event(`change`))
    }

    // -------------------------------------------------------------------------
    // Serialisation
    // -------------------------------------------------------------------------

    /** Returns a plain-object snapshot suitable for JSON.stringify, or undefined
     *  when no enums are defined (keeps the save file tidy). */
    get saveValue() {
        if (Object.keys(this.#enums).length === 0) return undefined
        return JSON.parse(JSON.stringify(this.#enums))
    }

    /** Restores state from a previously serialised snapshot. */
    set saveValue(saveValue) {
        this.#enums = {}
        if (!saveValue) {
            this.dispatchEvent(new Event(`change`))
            return
        }
        for (const name in saveValue) {
            this.#enums[name] = saveValue[name]
        }
        this.dispatchEvent(new Event(`change`))
    }
}
