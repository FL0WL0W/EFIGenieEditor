import UIButton from "../JavascriptUI/UIButton"
import { objectTester } from "../JavascriptUI/UIUtils"
import Input from "../Input/Input"
import UIDisplayLiveUpdate from "../UI/UIDisplayLiveUpdate"
export default class ConfigList extends HTMLDivElement {
    #staticItems = []
    get staticItems() { return this.#staticItems }
    set staticItems(staticItems) {
        if(objectTester(this.#staticItems, staticItems))
            return
        this.#staticItems = staticItems
        this.#addStaticItems();
    }
    #addStaticItems() {
        this.staticItems.forEach((item, index) => {
            if([...this.children].find(x => x.item === item.item) !== undefined)
                return
            const prevItem = this.staticItems[index - 1]?.item
            //if previousItem not contained in list
            if(prevItem === undefined || [...this.children].find(x => x.item === prevItem) === undefined ) {
                //look for nextItem
                let nextIndex = 1
                let nextItem = this.staticItems[index + nextIndex]?.item
                while(nextItem !== undefined && [...this.children].find(x => x.item === nextItem) === undefined) nextItem = this.staticItems[++nextIndex]?.item
                if(nextItem === undefined)
                    return this.appendNewItem(item.item)
                return this.appendNewItem(item.item, [...this.children].find(x => x.item === nextItem))
            }
            return this.appendNewItem(item.item, [...this.children].find(x => x.item === prevItem).nextSibling)
        })
    }

    #dragState
    #dragFrame

    #startDrag(item, handle, event) {
        const itemRect = item.getBoundingClientRect()
        const handleRect = handle.getBoundingClientRect()
        const listRect = this.getBoundingClientRect()
        const children = [...this.children]
        const itemIndex = children.indexOf(item)
        const listStyle = getComputedStyle(this)
        const listWidth = listStyle.width
        const listHeight = listStyle.height
        this.#dragState = {
            item,
            height: itemRect.height,
            pointerOffset: handleRect.top - itemRect.top + handleRect.height / 2,
            position: item.style.position,
            top: item.style.top,
            width: item.style.width,
            minWidth: this.style.minWidth,
            minHeight: this.style.minHeight,
            maxTop: Math.max(0, this.clientHeight - itemRect.height),
            rows: children.flatMap((row, index) => {
                if(row === item)
                    return []
                const rect = row.getBoundingClientRect()
                return [{ row, middle: rect.top - listRect.top + rect.height / 2, before: index < itemIndex }]
            })
        }
        // Keep removing the dragged row from changing the list's measured size.
        this.style.minWidth = listWidth
        this.style.minHeight = listHeight
        item.style.width = `${itemRect.width}px`
        item.item.classList.add(`dragging`)
        if(event.dataTransfer) {
            const dragIcon = new Image()
            dragIcon.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
            event.dataTransfer.setDragImage(dragIcon, 0, 0)
        }
    }

    #updateDrag() {
        const state = this.#dragState
        if(!state || state.clientY === undefined)
            return

        // Reuse the row bounds measured at drag start; only scrolling changes the list's top.
        const listTop = this.getBoundingClientRect().top
        const top = Math.max(0, Math.min(
            state.clientY - listTop - state.pointerOffset,
            state.maxTop
        ))
        state.afterElement = state.rows.find(({ middle, before }) =>
            before ? top < middle : top + state.height < middle
        )?.row ?? null

        const gapElement = state.afterElement ?? state.rows.at(-1)?.row
        const gapProperty = state.afterElement ? `marginTop` : `marginBottom`
        if(state.gapElement !== gapElement || state.gapProperty !== gapProperty) {
            if(state.gapElement)
                state.gapElement.style[state.gapProperty] = state.gapValue
            state.gapElement = gapElement
            state.gapProperty = gapProperty
            if(gapElement) {
                state.gapValue = gapElement.style[gapProperty]
                gapElement.style[gapProperty] = `${state.height}px`
            }
        }
        state.item.style.position = `absolute`
        state.item.style.top = `${top}px`
    }

    #endDrag() {
        const state = this.#dragState
        if(!state)
            return
        if(this.#dragFrame !== undefined) {
            cancelAnimationFrame(this.#dragFrame)
            this.#dragFrame = undefined
            this.#updateDrag()
        }
        if(state.gapElement)
            state.gapElement.style[state.gapProperty] = state.gapValue
        state.item.item.classList.remove(`dragging`)
        state.item.style.position = state.position
        state.item.style.top = state.top
        state.item.style.width = state.width
        this.style.minWidth = state.minWidth
        this.style.minHeight = state.minHeight
        const moved = state.afterElement !== undefined && state.afterElement !== state.item.nextElementSibling
        if(moved)
            this.insertBefore(state.item, state.afterElement)
        this.#dragState = undefined
        if(moved) {
            this.updateControls()
            this.dispatchEvent(new Event(`change`, { bubbles: true }))
        }
    }

    constructor(prop) {
        super()
        this.class = `itemList`
        // One handler per list; adding/removing rows must not add more handlers.
        this.addEventListener(`dragover`, event => {
            if(!this.#dragState)
                return
            event.preventDefault()
            event.stopPropagation()
            this.#dragState.clientY = event.clientY
            if(this.#dragFrame === undefined) {
                this.#dragFrame = requestAnimationFrame(() => {
                    this.#dragFrame = undefined
                    this.#updateDrag()
                })
            }
        })
        this.newItemElement = new UIButton({className: `controlnew`})
        this.newItemElement.addEventListener(`click`, () => { this.appendNewItem(this.newItem()) })
        prop ??= {}
        const propSaveValue = prop.saveValue ?? []
        const propValue = prop.value
        delete prop.saveValue
        delete prop.value
        Object.assign(this, prop)
        if(propSaveValue != undefined)
            this.saveValue = propSaveValue
        if(propValue != undefined)
            this.value = propValue

        this.tabListElement = document.createElement(`div`)
        this.tabListNewElement = document.createElement(`div`)
        this.tabListNewElement.class = `w3-bar-subitem w3-button`
        this.tabListNewElement.textContent = `+ New`
        this.tabListNewElement.addEventListener(`click`, () => { this.appendNewItem() })
        this.addEventListener(`change`, () => {
            while([...this.children].filter(x => x.item.constructor === Input).length < this.tabListElement.children.length || this.tabListElement?.firstChild?.firstChild === this.tabListNewElement) this.tabListElement.removeChild(this.tabListElement.lastChild)
            for(let i = 0, iL = 0; i < this.children.length; i++){
                const name = this.children[i].item?.name?.value ?? this.children[i].item?.label
                if(!name)
                    continue
                let tabElement = this.tabListElement.children[iL++]
                if(!tabElement) {
                    tabElement = this.tabListElement.appendChild(document.createElement(`div`))
                    if(this.children[i].item.constructor === Input) {
                        tabElement.appendChild(new UIDisplayLiveUpdate()).style.float = `right`
                        tabElement.RegisterVariables = function() {
                            const input = thisClass.children[this.childIndex]
                            const unit = input.translationConfig.outputUnits?.[0] ?? input.rawConfig.outputUnits?.[0];
                            if(unit)
                                this.firstChild.RegisterVariables({ name: `Inputs.${input.name.value}`, unit: unit })
                        }
                    }
                    tabElement.append(document.createElement(`div`))
                    tabElement.class = `w3-bar-subitem w3-button`
                    const thisClass = this
                    tabElement.addEventListener(`click`, function() {
                        thisClass.children[this.childIndex].scrollIntoView({
                            behavior: 'auto',
                            block: 'center',
                            inline: 'center'
                        })
                    })
                }
                tabElement.childIndex = i
                tabElement.lastChild.textContent = name
                tabElement.class = `w3-bar-subitem w3-button`
            }
            if(this.tabListElement.children.length === 0){
                let tabElement = this.tabListElement.appendChild(document.createElement(`div`))
                tabElement.appendChild(this.tabListNewElement)
            }
        })
        this.dispatchEvent(new Event(`change`, {bubbles: true}))
    }

    updateControls() {
        for(let i = 0; i < this.children.length; i++){
            const hamburger = this.children[i].controlElement.children[2]
            const isStatic = this.staticItems.find(x => x.item === this.children[i].item) !== undefined
            if(isStatic) {
                hamburger.className = 'controldummy'
            } else {
                hamburger.className = 'controlhamburger'
            }
        }
        if(this.lastChild)
            this.lastChild.controlElement.append(this.newItemElement)
        else
            this.parentElement?.insertBefore?.(this.newItemElement, this)
    }

    appendNewItem(newItem, before) {
        newItem = newItem ?? this.newItem()
        let itemContainer = document.createElement(`div`)
        itemContainer.classList.add(`itemContainer`)
        itemContainer.item = itemContainer.appendChild(newItem)
        itemContainer.item.classList.add(`item`)
        itemContainer.controlElement = itemContainer.appendChild(document.createElement(`span`))
        itemContainer.controlElement.classList.add(`controlcontainer`)
        let addElement = itemContainer.controlElement.appendChild(document.createElement(`span`))
        addElement.className = `controladd`
        const thisClass = this
        addElement.addEventListener(`click`, function() {
            thisClass.appendNewItem(thisClass.newItem(), this.parentElement.parentElement)
        })
        itemContainer.controlElement.appendChild(document.createElement(`span`)).className = `controldummyfill`
        let hamburgerElement = itemContainer.controlElement.appendChild(document.createElement(`span`))
        hamburgerElement.className = `controlhamburger`
        hamburgerElement.draggable = true
        hamburgerElement.addEventListener(`dragstart`, event => {
            this.#startDrag(itemContainer, hamburgerElement, event)
        })
        hamburgerElement.addEventListener(`dragend`, () => { this.#endDrag() })
        hamburgerElement.addEventListener(`click`, function(event) {
            if(this.disabled)
                return
            event.stopPropagation()

            // remove any existing hamburger menus
            document.querySelectorAll('.hamburger-menu').forEach(e => e.remove())
            document.querySelectorAll('.hamburger-open').forEach(e => e.classList.remove('hamburger-open'))

            // build menu
            const menu = document.createElement('div')
            menu.className = 'hamburger-menu'
            const divDelete = document.createElement('div')
            divDelete.className = 'hamburger-menu-delete'
            divDelete.addEventListener('click', (e) => {
                e.stopPropagation()
                const itemContainer = hamburgerElement.parentElement.parentElement
                // remove the item container
                if(itemContainer && itemContainer.parentElement)
                    itemContainer.parentElement.removeChild(itemContainer)
                // cleanup menu
                menu.remove()
                // refresh controls and emit change
                thisClass.updateControls()
                thisClass.dispatchEvent(new Event('change', {bubbles: true}))
            })
            menu.appendChild(divDelete)
            this.appendChild(menu)

            // position menu near the hamburger
            const hamburgerOnLeft = [...thisClass.querySelectorAll('.itemContainer .configContainer .controlcontainer .controlhamburger')].indexOf(this) !== -1
            const top =  this.offsetHeight / 2 - menu.offsetHeight / 2
            const left = hamburgerOnLeft? this.offsetWidth : -menu.offsetWidth
            menu.style.left = `${left}px`
            menu.style.top = `${top}px`
            const hamburger = this;
            hamburger.classList.add(`hamburger-open`)
            // close when clicking elsewhere
            document.addEventListener('click', function() { menu.remove(); document.removeEventListener('click', this); hamburger.classList.remove(`hamburger-open`) })
        })
        itemContainer.controlElement.appendChild(document.createElement(`span`)).className = `controldummyfill`

        itemContainer.RegisterVariables = function(reference) { this.item.RegisterVariables?.(reference) }
        Object.entries(itemContainer.item).forEach(function([elementName, element]) {
            if(itemContainer[elementName] !== undefined)
                return
            Object.defineProperty(itemContainer, elementName, {
                get: function() { return this.item[elementName] },
                set: function(elementValue) { this.item[elementName] = elementValue }
            })
        })
        if(before === undefined) {
            this.append(itemContainer)
        } else {
            this.insertBefore(itemContainer, before)
        }
        this.updateControls()
        this.dispatchEvent(new Event(`change`, {bubbles: true}))
    }

    newItem() {
        return new (this.itemConstructor ?? this.constructor.itemConstructor)()
    }

    get saveValue () { return [...this.children].map(e => { return this.staticItems.find(x => x.item === e.item) !== undefined? { [this.staticItems.find(x => x.item === e.item)?.name] : e.item.saveValue } : e.item.saveValue }) }
    set saveValue(saveValue) { 
        //remove all static items from list, we will add them back as we populate
        ;[...this.children].forEach(item => {
            if(this.staticItems.find(x => x.item === item.item) !== undefined) {
                this.removeChild(item)
            }
        })
        while(this.children.length > saveValue.length) this.removeChild(this.lastChild)
        for(let i = 0; i < saveValue.length; i++){
            const staticItem = this.staticItems.find(x => Object.keys(saveValue[i]).length === 1 && x.name === Object.keys(saveValue[i])[0])?.item 
            if(!this.children[i] || staticItem !== undefined) {
                const item = staticItem ?? this.newItem()
                this.appendNewItem(item, this.children[i])
            }
            if(staticItem)
                this.children[i].item.saveValue = saveValue[i][Object.keys(saveValue[i])[0]]
            else
                this.children[i].item.saveValue = saveValue[i]
        }
        this.#addStaticItems();
        this.updateControls()
        this.dispatchEvent(new Event(`change`, {bubbles: true}))
    }

    get value () { return [...this.children].map(e => { return this.staticItems.find(x => x.item === e.item) !== undefined? { [this.staticItems.find(x => x.item === e.item)?.name] : e.item.value } : e.item.value }) }
    set value(value) { 
        //remove all static items from list, we will add them back as we populate
        ;[...this.children].forEach(item => {
            if(this.staticItems.find(x => x.item === item.item) !== undefined)
                this.removeChild(item)
        })
        while(this.children.length > value.length) this.removeChild(this.lastChild)
        for(let i = 0; i < value.length; i++){
            const staticItem = this.staticItems.find(x => Object.keys(value[i]).length === 1 && x.name === Object.keys(value[i])[0])?.item 
            if(!this.children[i] || staticItem !== undefined) {
                const item = staticItem ?? this.newItem()
                this.appendNewItem(item, this.children[i])
            }
            if(staticItem)
                this.children[i].item.value = value[i][Object.keys(value[i])[0]]
            else
                this.children[i].item.value = value[i]
        }
        this.#addStaticItems();
    }

    RegisterVariables(reference) {
        this.updateControls()
        for(var i = 0; i < this.children.length; i++){
            this.children[i].RegisterVariables(reference)
        }
        for(var i = 0; i < this.tabListElement.children.length; i++){
            this.tabListElement.children[i].RegisterVariables?.()
        }
    }
}
customElements.define(`top-config-list`, ConfigList, { extends: `div` })
