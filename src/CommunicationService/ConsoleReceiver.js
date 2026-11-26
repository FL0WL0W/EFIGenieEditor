/** Decode a printf byte stream without splitting UTF-8 characters or console lines. */
export default class ConsoleReceiver {
    #decoder = new TextDecoder()
    #line = ''
    constructor(prefix = '[E78]', log = (...args) => console.log(...args)) {
        this.prefix = prefix
        this.log = log
    }
    receive(data) {
        this.#append(this.#decoder.decode(data, { stream: true }))
    }
    #append(text) {
        this.#line += text
        let end
        while((end = this.#line.indexOf('\n')) !== -1) {
            this.log(this.prefix, this.#line.slice(0, end).replace(/\r$/, ''))
            this.#line = this.#line.slice(end + 1)
        }
    }
    close() {
        this.#append(this.#decoder.decode())
        if(this.#line) this.log(this.prefix, this.#line)
        this.#line = ''
        this.#decoder = new TextDecoder()
    }
}
