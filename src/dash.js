// Polyfill -> IE -> querySelector().forEach()
(function () {
    if (typeof NodeList.prototype.forEach === "function") return false;
    NodeList.prototype.forEach = Array.prototype.forEach;
})();

// Polyfill -> All -> .matches()
if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.matchesSelector || Element.prototype.mozMatchesSelector || Element.prototype.msMatchesSelector || Element.prototype.oMatchesSelector || Element.prototype.webkitMatchesSelector ||
        function (s) {
            var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                i = matches.length;
            while (--i >= 0 && matches.item(i) !== this) {}
            return i > -1;
        };
}

/**
 * DashResource class constructor
 *
 * @class DashResource
 *
 * @param  {String} resource The resource name
 */
class DashResource {
    constructor(resource) {
        if (Dash.config.baseResourceURL != null) {
            this.uri = Dash.config.baseResourceURL + '/' + resource;
        } else {
            console.warn(new DashConfigException('baseResourceURL config not set'));
        }
    }

    /**
     * Fetches a listing of the resource
     *
     * @param  {String}    id        The ID of the resource to fetch
     * @param  {Function}  callback  The callback function to execute after ajax call return
     * @param  {mixed}     formdata  Form data to send as request payload
     * @param  {Object}    config    Configuation object containing options for making requests
     *
     * @returns void
     */
    get(id, callback, formdata, config = {}) {
        Dash.resources.get(this.uri + '/' + (id || ''), callback, formdata, config);
    }

    /**
     * Initiates a POST ajax request to create a resource on server
     *
     * @see Dash.resources.create
     *
     * @param  {FormData} formdata Form data to send as request payload
     * @param  {Function} callback Callback function to execute after ajax call return
     * @param  {Object}   config    Configuation object containing options for making requests
     *
     * @return void
     */
    create(formdata, callback = null, config = {}) {
        Dash.resources.create(this.uri, formdata, callback, config);
    }

    /**
     * Updates a resource on the server
     *
     * @param  {Number}   id        The ID of the resource to update
     * @param  {any}      formdata  Form data to send as request payload
     * @param  {Function} callback  Callback function to execute after ajax call return
     * @param  {Object}   config    Configuation object containing options for making requests
     *
     * @returns void
     */
    update(id, formdata = null, callback = () => {}, config = {}) {
        var url = this.uri + '/' + id;
        Dash.resources.update(url, formdata, callback, config);
    }

    /**
     * @param {Number}   id        The ID of the resource to delete
     * @param {Function} fn        Callback function to execute after ajax call return
     * @param {Object}   config    Configuation object containing options for making requests
     *
     * @return void
     */
    delete(id, fn = null, config = {}) {
        var url = this.uri + '/' + id;
        Dash.resources.delete(url, fn, config);
    }
}

/**
 * FormInputsException class constructor
 *
 * @param  {String} message The exception error message
 * @param  {mixed} input Missing/empty required inputs
 */
function DashFormInputsException(message, input) {
    this.name = 'FormInputsError';
    this.message = message;
    this.inputs = input;
}

/**
 * FormInputsException class constructor
 *
 * @param  {String} message The exception error message
 */
function DashConfigException(message) {
    this.name = 'ConfiguationError';
    this.message = message;
}

/**
 * DashSelectorException class constructor
 *
 * @param  {String} message The exception error message
 */
function DashSelectorException(message) {
    this.name = 'SelectorError';
    this.message = message;
}

/**
 * DashSelectorException class constructor
 *
 * @param  {String} message The exception error message
 */
function DashTypeException(message, object) {
    this.name = 'TypeError';
    this.message = message;
    this.object = object;
}

var Dash = {
    // Handlers object, can be used to store all event handlers
    handlers: {
        handleViewAnchorClick: function (e) {
            e.preventDefault();
            // Dash.state.lastViewAnchor = e.currentTarget;

            Dash.getView(e.currentTarget.getAttribute('data-name'));
        },

        /**
         * Automatically reloads dashboard content if autoReload set to true
         *
         * @param  {XMLHttpRequest} xhr
         */
        reloadIfAutoReload: function (xhr) {
            // If auto reload is enabled, reload content
            if (Dash.config.autoReload) {
                Dash.reloadContent();
            }
        }
    },

    // Configuration object
    config: {
        // {String}  CSS selector of active form i.e the general CSS selector of a form that is currently being edited
        activeForm: null,
        // {Boolean} When set to true reloads the dashboard content after a successful return of `Dash.resources.create`
        autoReload: false,
        // {String} Base API endpoint e.g. https://your-app.com/api/v1
        baseResourceURL: null,
        // {String}  CSS selector for the dashboard content wrapper
        content: '#content',
        // {Object} Default headers to be passed with every request/API call
        requestHeaders: {},
        // {Boolean} This when set to true will trigger a click on the first item in your view anchor NodeList i.e. the first link in your app menu
        triggerInitialViewFetch: false,
        // {String} General CSS selector for your view anchors / app menu
        viewSelector: '.view-anchor',
        // {String}  CSS selector for reload button i.e. button to reload your dashboard/app content only leaving menu and other static components intact
        reloadSelector: '.reload',
        // {Boolean}  Enable history manipulation feature
        history: false,
        // {String}  Application URL
        appURL: window.location.href
    },

    // State object, contains variables that keep state data
    state: {
        lastViewURL: null,
        lastViewName: null,
        lastViewAnchor: null,
        lastClickedActionButton: null,
        appURL: null,
        appTitle: null
    },

    // View anchor nodes
    views: [],

    // Actions object
    actions: {},

    /**
     * A wrapper for window.setTimeout
     *
     * @param  {Function} fn A function to be executed after the timer expires.
     * @param  {Number} time The time, in milliseconds (thousandths of a second), the timer should wait before the specified function or code is executed
     *
     * @return void
     */
    wait: function (fn, time) {
        window.setTimeout(function () {
            fn.call();
        }, time);
    },

    /**
     * A wrapper for document.querySelector
     *
     * @param  {String} selector A group of selectors to match the descendant elements of document against
     *
     * @return {HTMLElement}
     */
    select: function (selector) {
        return document.querySelector(selector);
    },

    /**
     * Wrapper for document.querySelectorAll
     *
     * @param  {String} selector DOMString containing one or more selectors to match against
     *
     * @return {NodeList}
     */
    selectAll: function (selector) {
        return document.querySelectorAll(selector);
    },

    /**
     * Constructs and returns full resource url
     *
     * @param {String} concat Path to resource
     *
     * @returns {mixed}
     */
    url: function (concat) {
        if (this.config.baseResourceURL)
            return this.config.baseResourceURL + '/' + concat;
        else
            throw "Base URL not set in config";
    },

    /**
     * Get view from server with abs URL
     *
     * @param  {mixed}  url
     * @param  {mixed}  data
     * @param  {Object} config  Configuation object containing options for making requests
     *
     * @return void
     */
    getView: function (url, configuration = {}) {
        let viewAnchor,
            config = {
                // {Mixed} Form data to pass as request body
                data: {},
                // {Function} Callback to execute on successful request
                success: null,
                // {Boolean} Run default .then callback
                defaultCallback: true,
                // {HTMLElement} The container element within which HTML is rendered
                container: Dash.select(Dash.config.content)
            };

        config = Object.assign(config, configuration);

        if (typeof url == "number") {
            // If node with index exists
            viewAnchor = this.views[url];
        } else {
            this.views.forEach(function (node) {
                if (node.getAttribute('data-name') == url)
                    viewAnchor = node;
            });
        }

        if (viewAnchor) {
            url = viewAnchor.getAttribute('data-href');
            // Set lastViewAnchor state variable
            Dash.state.lastViewAnchor = viewAnchor;
        }

        Dash.state.lastViewURL = url;

        // Send request for view passed by url, renders the response afterwards
        this.request(Dash.state.lastViewURL, config.data, function (response) {
            // Render view
            Dash.renderResponse(response, config.container).then((response) => {
                // View name if via view anchors
                let viewName = viewAnchor ? viewAnchor.getAttribute('data-name') : null;

                // Call the defined callback after view has been succefully rendered
                if (typeof Dash.getView.then === 'function') {
                    // Call .then callback
                    if (config.defaultCallback) {
                        Dash.getView.then.call(this, viewName, response, Dash.select(Dash.config.content));
                    }
                }

                // Push history state
                if (viewAnchor && Dash.config.history) {
                    let href = new String(Dash.state.appURL),
                        url = (href.charAt(href.length - 1) !== '/') ? href + '/' + viewName : viewName;

                    url = url.toLowerCase();

                    // State Object
                    let stateObj = {
                        view: viewName
                    };

                    Dash.history.change(stateObj, Dash.state.appTitle + ' | ' + viewName, url, function (state) {
                        Dash.getView(state.view);
                    });
                }
            }).then(() => {
                if (typeof config.success == 'function') config.success.call(this, response);
            }).catch(console.log.bind(console));

        }, Object.assign({
            method: 'GET',
            isViewRequest: true
        }, config));
    },

    /**
     * Sets up a function that will be called whenever the specified event is delivered to the target.
     *
     * @param  {String}   event  The DOM event to bind
     * @param  {String}   parentSelector  Selector of any parent element guaranteed present immediately after DOMContentLoaded
     * @param  {String}   selector  Selector of element to bind the event to
     * @param  {Function} listener  A callback function to be called on event firing.
     * @param  {Boolean}  useCapture=false  A Boolean indicating whether events of this type will be dispatched to the registered listener before being dispatched to any EventTarget beneath it in the DOM tree
     *
     * @returns void
     */
    bind: function (event, parentSelector, selector, listener, useCapture = false) {
        // Get the parent node we need as 'this' if target is a child of 'parent node'
        function getParentNode(target, selector) {
            var node = target.parentNode;
            return node.matches(selector) ? node : getParentNode(node, selector);
        }

        // Get parent element, should be in the DOM on DOMContentLoaded
        var element = document.querySelector(parentSelector);

        if (element) {
            element.addEventListener(event, function (e) {
                var target = e.target,
                    match = target.matches(selector),

                    regex = new RegExp('(,)', 'gim'),
                    childSelectors = selector.replace(regex, function (match) {
                        return ' *,'
                    });

                var matchesChild = target.matches(childSelectors.trim() + ' *');

                // Register selector to hasOwnEvents array
                if (match || matchesChild) {
                    var node = match ? target : getParentNode(target, selector);
                    listener.call(node, e);
                }
            }, useCapture);
        } else {
            throw new DashSelectorException(parentSelector + ' does not any element in the DOM');
        }
    },

    // Initialize DashJS setting configs, setting up events and request headers
    init: function (optionsObject = {}) {
        // Bulk set config
        for (var option in optionsObject) {
            Dash.config[option] = optionsObject[option];
        }
        // Set default config
        this.config.requestHeaders['X-Requested-With'] = 'XMLHttpRequest';

        this.views = document.querySelectorAll(this.config.viewSelector);
        this.notify = this.config.notify;

        var refreshBtn = document.querySelector(this.config.reloadSelector);
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function (e) {
                Dash.reload();
            }, false);
        }

        // Set application title
        Dash.state.appTitle = document.title;
        // Set application URL
        Dash.state.appURL = Dash.config.appURL;

        // Bind click events to view anchor nodes
        this.views.forEach(function (element, index) {
            element.addEventListener('click', Dash.handlers.handleViewAnchorClick, false);
        });

        // if triggerInitialViewFetch config is set to true, trigger click on the first view anchor node
        if (this.config.triggerInitialViewFetch) {
            try {
                // Trigger click
                this.views[0].click();
            } catch (e) {
                if (e.name == 'TypeError') {
                    // Log exception
                    console.warn(new DashSelectorException('View selector does not match any element'));
                }
            }
        }

        // Initialize events, binds the action events
        Dash.events.init();

        // Initialize history
        Dash.history.init();
    },

    /**
     * Binds data contained within DOM elements
     *
     * @param  {HTMLElement} bindingFrom The source of the data
     * @param  {HTMLElement} bindingTo Placeholder element
     *
     * @return void
     */
    bindData: function (bindingFrom, bindingTo) {
        // All elements in "from" with data-name attributes
        var bindables = bindingFrom.querySelectorAll('[data-name]');

        bindables.forEach(function (node) {
            var name = node.getAttribute('data-name'),
                toElements = bindingTo.querySelectorAll('[data-name=' + name + ']');

            if (toElements.length) {
                // Corresponding placeholder exists in DOM

                toElements.forEach((toElement) => {
                    if (toElement.matches('input, textarea')) {
                        toElement.value = node.value || node.innerText;
                    } else {
                        toElement.innerText = node.value || node.innerText;
                    }
                });
            }
        });
    },

    /**
     * Initializes an ajax request
     *
     * @param  {String}    url            URL to send request to
     * @param  {FormData}  data           A body of data to be sent in the XHR request, preferably FormData
     * @param  {Function}  successfn      A callback function to run after AJAX return
     * @param  {Object}    configuration  Configuation object containing options for making requests
     *
     * @return {XMLHttpRequest}
     */
    request: function request(url, data, successfn, configuration) {
        let config = {
            // {String} The HTTP request method to use, such as "GET", "POST", "PUT", "DELETE", etc. Ignored for non-HTTP(S) URLs
            method: 'POST',
            // {Boolean} Is the request fetching a view/html
            isViewRequest: false,
            // {Array} Headers to add to request
            headers: {},
            // {Function} Callback called on progress
            progress: null,
            // {Function} Callback to handle errors
            error: null,
            // {Function} Callback to execute on successful request
            success: null,
            // {Boolean} Send PATCH requests as POST
            usePost: false,
            // {Boolean} Sets tempOffAutoReload to true
            tempOffAutoReload: false,
            // {Mixed} Form data to pass as request body
            data: {}
        };

        // Set values to that of $configuration or default
        for (const option in config) {
            if (config.hasOwnProperty(option)) {
                config[option] = configuration[option] || config[option];
            }
        }

        let dash = this,
            type = config.method.toUpperCase(),

            tGet = type == 'GET',
            tHead = type == 'HEAD',
            tDelete = type == 'DELETE',
            tPost = type == 'POST',
            tPatch = type == 'PATCH',

            isViewRequest = config.isViewRequest,
            requestHeaders = Object.assign(this.config.requestHeaders, config.headers),
            xhr = new XMLHttpRequest();

        // Ready state change
        xhr.onreadystatechange = function () {
            switch (xhr.readyState) {
                case XMLHttpRequest.OPENED:
                    // Set request headers
                    Object.keys(requestHeaders).forEach(function (header) {
                        xhr.setRequestHeader(header, requestHeaders[header]);
                    });

                    break;

                case XMLHttpRequest.DONE:
                    // Attempt parse response as json
                    try {
                        var response = JSON.parse(xhr.responseText);
                    } catch (error) {
                        var response = xhr.responseText;
                    }

                    // Resquest completed succefully
                    if (xhr.status >= 200 && xhr.status < 300) {
                        if (typeof successfn === 'function') {
                            successfn.call(xhr, response);
                        }
                    } else if (typeof config.error === 'function') {
                        // Call error callback
                        config.error.call(xhr, response, xhr.status);
                    }

                    // Call universal request callback
                    if (!isViewRequest && typeof Dash.request.then === 'function') Dash.request.then(response);

                    break;
            }
        };

        // If progress extended call
        xhr.onprogress = function (e) {
            if (isViewRequest && typeof dash.getView.progress === 'function')
                dash.getView.progress(xhr, e, dash.state.lastViewAnchor);

            // Call default progress handler
            else if (!isViewRequest && typeof dash.request.progress === 'function')
                dash.request.progress(xhr, e);
        }

        // Upload progress
        xhr.upload.onprogress = function (e) {
            if (typeof config.progress == 'function')
                config.progress.call(xhr, e);
        }

        xhr.onerror = function (e) {
            if (typeof config.error === 'function') {
                // Call error callback
                config.error.call(xhr);
            }
        }

        // Convert to object to FormData
        if ({}.toString.call(data) == '[object Object]' && !tGet && !tDelete) {
            data = this.form.serializeMapData(data);
        }
        // Use POST for patch requests
        if (config.usePost) {
            data.append('_method', 'PATCH')
        }
        // Set to true if delete request has data
        let deleteWithData = false
        if (tDelete) {
            for (let key in data) {
                deleteWithData = true;
            }
        }

        url = tGet || deleteWithData ? url + Dash.utility.encodeURL(data) : url;

        xhr.open(type, url);
        xhr.send((tGet || tHead || deleteWithData) ? null : data);
        return xhr;
    },

    /**
     * Initializes a GET ajax request
     *
     * @param  {String}   url          URL to send request to
     * @param  {FormData} data         A body of data to be sent in the XHR request, preferably FormData
     * @param  {Function} successfn    A callback function to run after AJAX return
     * @param  {Object}  config       Configuation object containing options for making request
     *
     * @return {XMLHttpRequest}
     */
    get: function (url, data, successfn, config = {}) {
        return this.request(url, data, successfn, Object.assign({
            method: 'get'
        }, config));
    },

    /**
     * Initializes a POST ajax request
     *
     * @param  {String}   url          URL to send request to
     * @param  {FormData} data         A body of data to be sent in the XHR request, preferably FormData
     * @param  {Function} successfn    A callback function to run after AJAX return
     * @param  {Object}   config       Configuation object containing options for making request
     *
     * @return {XMLHttpRequest}
     */
    post: function (url, data, successfn, config = {}) {
        return this.request(url, data, successfn, Object.assign({
            method: 'post'
        }, config));
    },

    /**
     * Inserts returned view/html into document body
     *
     * @param {mixed} response
     * @param {XMLHttpRequest} The request object
     *
     * @return void
     */
    renderResponse: function (response, container) {
        var contentWrapper = container, // Contents Wrapper
            insert = () => {
                return new Promise((resolve, reject) => {
                    contentWrapper.innerHTML = "";
                    contentWrapper.insertAdjacentHTML('afterbegin', response);

                    resolve(response);
                });
            };

        return insert();
    },

    /**
     * Reloads the current window location
     *
     * @return void
     */
    reload: function () {
        window.location.reload();
    },

    /**
     * Reloads page content
     *
     * @return void
     */
    reloadContent: function () {
        Dash.state.lastViewAnchor.click();
    },

    /**
     * Get the current active form
     *
     * @return HTMLElement
     */
    getActiveForm: function () {
        return document.querySelector(Dash.config.activeForm);
    },

    /**
     * Register a submit event handler
     *
     * @param {String}    formId            The id of the form to bind onsubmit event to
     * @param {Function}  callback          Function to execute
     * @param {Array}     requiredInputs    Array of required input fields
     * @param {Function}  failedValidation  A callback called on failed validation of required input elements
     *
     * @return {void}
     */
    submit: function (formId, callback, requiredInputs = null, failedValidation) {
        // Reference the Dash.form.checkEmptyInputs() method
        var emptyInputs = this.form.checkEmptyInputs,
            serializeData = this.form.serializeData;

        // Bind submit event to form element
        Dash.bind('submit', 'body', ('#' + formId), function (e) {
            e.preventDefault();
            var formNode = this;

            if (requiredInputs) {
                if (Array.isArray(requiredInputs)) {
                    if (requiredInputs.length == 1 && requiredInputs[0] == '*') {
                        // Get all input elements
                        var inputNodes = formNode.querySelectorAll('[name]:not(.not-required)');
                    } else {
                        var inputNodes = requiredInputs.map(input => {
                            // Get required input nodes from DOM
                            return formNode.querySelector('[name=' + input + ']');
                        });
                    }
                    let testEmptyInputs = emptyInputs(inputNodes);

                    if (testEmptyInputs.empty) {
                        // throw exception DashFormInputsException
                        let e = new DashFormInputsException("Some required inputs empty", testEmptyInputs.input);
                        if (typeof failedValidation == "function")
                            failedValidation.call(formNode, e);
                        else
                            console.warn(e);

                        return;
                    }
                } else {
                    // throw exception DashFormInputsException
                    let e = new DashFormInputsException('Invalid args supplied for required inputs');
                    if (typeof failedValidation == "function")
                        failedValidation.call(formNode, e);
                    else
                        console.warn(e);

                    return
                }
            }

            callback.call(formNode, e, serializeData(formNode), formNode.action);
        });
    },

    submitAll: function (formId, callback, failedValidation) {
        this.submit(formId, callback, ['*'], failedValidation);
    },

    // Forms object
    form: {
        /**
         * Clear and initialize all input fields
         *
         * @param  {HTMLFormElement} form
         */
        sanitize: function (form) {
            var inputs = (form || document.querySelector(Dash.config.activeForm))
                .querySelectorAll('input[type=text],input[type=password], input[type=email], input[type=telephone]');

            inputs.forEach(function (input) {
                input.value = '';
                input.blur();
            });
        },

        // Checks for empty inputs
        checkEmptyInputs: function (nodes) {
            let test = {
                empty: false,
                input: []
            };

            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i]) {
                    if (nodes[i].value.trim() == "") {
                        test.empty = true;
                        test.input.push(nodes[i]);
                    }
                } else {
                    throw "Required input element " + index + " supplied is null";
                }
            }

            return test;
        },

        /**
         * Serialize form input elements within a given form
         *
         * @param {HTMLElement} form The form element
         * @param {Boolean} INCLUDE_EMPTY Serialize empty input fields?
         *
         * @return {FormData}
         */
        serializeData: function (form, INCLUDE_EMPTY) {
            var formdata = new FormData(),
                inputs = form.querySelectorAll('input[name], select[name], textarea[name]');

            inputs.forEach(function (input) {
                if (input.getAttribute('type') == 'file') {
                    var name = input.getAttribute('name');
                    if (input.files !== undefined) {
                        for (let i = 0; i < input.files.length; i++) {
                            formdata.append(name, input.files[i]);
                        }
                    }
                } else if (input.value != '' || INCLUDE_EMPTY) {

                    if (input.getAttribute('type') == 'checkbox' && !input.checked) {} else {
                        formdata.append(input.getAttribute('name'), input.value);
                    }
                }
            });

            return formdata;
        },

        /**
         * @param  {FormData} The FornData object to convert to json
         *
         * @return {FormData}
         */
        stringifyData: function (formData) {
            let object = {};
            formData.forEach((value, key) => {
                object[key] = value
            });

            return JSON.stringify(object);
        },

        serializeMapData: function (map) {
            var formdata = new FormData();

            for (const key in map) {
                if (map.hasOwnProperty(key)) {
                    formdata.append(key, map[key]);
                }
            }

            return formdata;
            // return JSON.stringify(map);
        }
    },

    /**
     * Returns a DashResource object
     *
     * @param  {String} resource The resource name
     *
     * @return DashResource
     */
    resource: function (resource) {
        return new DashResource(resource);
    },

    // Resources
    resources: {
        /**
         * Initializes a GET ajax request
         *
         * @param  {String}   url          URL to send request to
         * @param  {Function} callback     A callback function to run after AJAX return
         * @param  {FormData} formdata     A body of data to be sent in the XHR request, preferably FormData
         * @param  {Object}   config       Configuation object containing options for making request
         *
         * @return {XMLHttpRequest}
         */
        get: function (url, callback, formdata = {}, config) {
            // Set the url to uri passed or get it form the active form action attr
            Dash.request(url, formdata, callback, Object.assign({
                method: 'get'
            }, config));
        },

        /**
         * Initiates a POST ajax request to create a resource on server
         *
         * @param  {String}   uri        The resource URI
         * @param  {FormData} formdata   Data to send as request payload
         * @param  {Function} callback   Callback function to execute after ajax call return
         * @param  {Object}   config     Configuation object containing options for making request
         *
         * @return void
         */
        create: function (uri, formdata, callback, config) {
            // Set the url to uri passed or get it form the active form action attr
            var url = uri || Dash.getActiveForm().action,
                fn = function (response) {
                    // this -> XMLHttpRequest
                    Dash.resources.defaultCallback.call(this, callback, response, config);
                };

            Dash.request(url, formdata, fn, Object.assign({
                method: 'post'
            }, config));
        },

        /**
         * Initiates a POST ajax request to update a resource on server
         *
         * @param  {String}   url        The url to send the request to
         * @param  {mixed}    formdata   Data to send as request payload
         * @param  {Function} callback   Callback function to execute after ajax call return
         * @param  {Object}   config     Configuation object containing options for making request
         *
         * @returns void
         */
        update: function (url, formdata = null, callback = () => {}, config = {}) {
            var fn = function (response) {
                // this -> XMLHttpRequest
                Dash.resources.defaultCallback.call(this, callback, response, config);
            };

            Dash.request(url || Dash.getActiveForm().action, formdata, fn,
                Object.assign({
                    method: config.usePost ? 'post' : 'patch'
                }, config));
        },

        /**
         * Initiates a DELETE ajax request to delete a resource on server
         *
         * @param  {String}   url        The url to send the request to
         * @param  {Function} callback   Callback function to execute after ajax call return
         * @param  {Object}   config     Configuraion object containing options for making request
         *
         * @returns void
         */
        delete: function (url, callback = () => {}, config = {}) {
            var fn = function (response) {
                // this -> XMLHttpRequest
                Dash.resources.defaultCallback.call(this, callback, response, config);
            };

            // Make request
            Dash.request(url, config.data || {}, fn, Object.assign({
                method: 'delete'
            }, config));
        },

        /**
         * @param  {Mixed}    response   Response body
         * @param  {Function} callback   Callback function to execute after ajax call return
         * @param  {Object}   config     Configuraion object containing options for making request
         *
         * @returns void
         */
        defaultCallback: function (callback, response, config) {
            if (typeof callback == "function")
                callback.call(this, response);

            if (!config.tempOffAutoReload) {
                Dash.handlers.reloadIfAutoReload(this);
            }
        }
    },

    // Events
    events: {
        bindActionEvents: function () {
            var clickableElements = document.querySelectorAll('[data-action]');

            Dash.bind('click', 'body', '[data-action]', function (e) {
                // this references e.currentTarget
                var action = this.getAttribute('data-action');

                Dash.state.lastClickedActionButton = this;
                Dash.actions[action].call(this, e);
            });
        },

        // Initialize dash events
        init: function () {
            this.bindActionEvents();
        },
    },

    // Utility functions
    utility: {
        encodeURL: function (data) {
            var query = [];
            for (var key in data) {
                query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
            }
            return (query.length ? '?' + query.join('&') : '');
        },

        /**
         * @param  {FileList} files
         * @param  {HTMLElement} preview
         * @param  {Number} index
         *
         * @returns {Promise}
         */
        preview: function (files, preview, index = 0) {
            let file = files[index];

            // Test if file is an image
            if (!file.type.startsWith('image/')) {
                console.log('Files is not an image!');
                return false;
            }

            window.URL = window.URL || window.webkitURL;

            // Async process
            return new Promise((resolve, reject) => {
                // Get image file system url
                const img = new Image();

                img.src = window.URL.createObjectURL(file);
                img.file = file;
                img.style.maxWidth = '100%';
                img.onload = function () {
                    window.URL.revokeObjectURL(this.src);
                    resolve({
                        width: this.naturalWidth,
                        height: this.naturalHeight
                    });
                }
                // Insert img
                preview.appendChild(img);
            });
        },

        /**
         * @param  {String} q             The query string to search for
         * @param  {String} selector      Selector of container elements
         * @param  {String} searchBy      Property name, search is done against the value of a data-x attribute where x is searchBy
         * @param  {Object} configuration Configuation options to do the search with, refer to documentation
         */
        search: function search(q, selector, searchBy, configuration = {}) {
            let resultElements,
                config = Object.assign({
                    cache: false,
                    display: 'block'
                }, configuration);

            // Create cache
            if (!search.results) search.results = {};

            if (config.cache && search.results[q] != null) {
                // if cache enabled and results already exists
                resultElements = search.results[q];
            } else {
                // Get container elements, styles will be applied to these
                let containers = Dash.selectAll(selector),
                    containerElements = Array.from(containers);

                // Hides all containers
                containers.forEach(function (node) {
                    node.style.display = 'none';
                });

                // Filter container elements, match against $searchBy
                resultElements = containerElements.filter(function (container) {
                    try {
                        let text = container.querySelector('[data-name=' + searchBy + ']').innerText,
                            Regex = new RegExp(q, 'i');

                        return text.match(Regex);
                    } catch (error) {
                        console.error(error);
                        throw new DashTypeException('[data-name] attribute not found on element', container);
                    }
                });

                if (config.cache === true) search.results[q] = resultElements;
            }

            // Show results
            if (resultElements.length) {
                resultElements.forEach(function (node) {
                    node.style.display = config.display;
                });
            } else {
                if (typeof config.null == 'function') config.null.call(this, q);
            }

        }
    },

    // History implementation
    history: {
        current: null,
        popActions: [],
        entries: [],

        back: function () {
            window.history.back();
        },

        forward: function () {
            window.history.forward();
        },

        /**
         * @param  {String}   stateObj  The state object
         * @param  {String}   title     The new document title
         * @param  {String}   url       Address bar URL
         * @param  {Function} reverse   Callback to run on popstate
         *
         * @returns {void}
         */
        change: function (stateObj, title, url, reverse = null) {
            history.pushState(stateObj, title || '#', url);

            this.current = window.location.href;
            this.entries.push(this.current);

            // Set the reverse action
            if (reverse !== null) {
                this.popActions[this.current] = reverse;
            }

            if (title !== null) {
                // Change the document title.
                document.title = title;
            }
        },

        /**
         *  Watch for a change of history entry and call the assigned reverse function
         *
         * @returns {void}
         */
        init: function () {
            window.addEventListener('popstate', function (e) {
                Dash.history.current = window.location.href;

                // Call reverse function if assigned else push out active modal
                if (typeof Dash.history.popActions[Dash.history.current] == 'function') {
                    Dash.history.popActions[Dash.history.current].call(e, e.state);
                }

                Dash.history.entries.pop();

                // Handle document titles here
                if (e.state !== null) {
                    document.title = e.state.title;
                }
            });
        }

    },
};

export default Dash;
