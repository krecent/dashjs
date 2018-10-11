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

function select(selector) {
    return document.querySelector(selector);
}

//Automatically dashboard content if autoReload set to true
function reloadIfAutoReload(xhr) {
    if (xhr.status === 200) {
        // If auto reload is enabled, reload content
        if (Dash.config.autoReload) {
            Dash.reload();
        }
    }
}

/**
 * DashResource class
 * 
 * @class DashResource
 * 
 * @param  {String} resource The resource name
 */
function DashResource(resource) {
    this.uri = Dash.config.baseResourceURL + '/' + resource + '/';
}

/**
 * @param {Number} id The ID of the resource to delete
 * @param {Function} fn Callback function to execute after ajax call return
 * @param {FormData} data Form data to send as request payload
 * 
 * @return void
 */
DashResource.prototype.delete = function (id, fn = null, data = null) {
    // Set url resource url
    var url = this.uri + id,
        callback = function (response) {
            // this -> XMLHttpRequest
            if (typeof fn == "function")
                fn.call(this, response);

            reloadIfAutoReload(this);
        };

    Dash.request(url, data, callback, 'delete');
};

/**
 * Initiates a POST ajax request to create a resource on server
 * 
 * @see Dash.resources.create
 * 
 * @param  {FormData} formdata Form data to send as request payload
 * @param  {Function} callback Callback function to execute after ajax call return
 * 
 * @return void
 */
DashResource.prototype.create = function (formdata, callback) {
    Dash.resources.create(this.uri.trim(), formdata, callback);
}

var DashHandlers = {
    handleViewBtnClick: function (e) {
        e.preventDefault();

        // Set lastViewButton state variable
        Dash.state.lastViewButton = e.currentTarget;
        // Set lastViewName state variable
        Dash.state.lastViewName = e.currentTarget.getAttribute('data-name');

        Dash.getView(e.currentTarget.getAttribute('data-href'));
    },
};

var Dash = {
    // Actions object
    actions: {},
    // Handlers object, can be used to store all event handlers defined by dev
    handlers: {},

    // Configuration object
    config: {
        activeForm: null,
        autoReload: false,
        baseResourceURL: null,
        content: '.content-wrapper',
        requestHeaders: {},
        triggerInitialViewFetch: false,
        viewSelector: '.view-anchor',
        reloadSelector: '.reload'
    },

    // State object, contains variables that keep state data
    state: {
        lastViewURL: null,
        lastViewName: null,
        lastViewButton: null,
        lastClickedActionButton: null,
    },

    // A wrapper for window.setTimeout()
    wait: function (func, time) {
        window.setTimeout(function () {
            func.call();
        }, time);
    },

    // View anchor nodes
    view: null,

    // Get dashboard view from server with abs URL 
    getView: function (url, data = {}) {
        var viewAnchor;

        if (typeof url == "number") {
            // If node with index exists
            viewAnchor = this.views[url];
        } else {
            this.views.forEach(function (node) {
                if (node.getAttribute('data-name') == url)
                    viewAnchor = node;
            });
        }

        // Trigger click on view anchor
        if (viewAnchor) {
            url = viewAnchor.getAttribute('data-href');
            Dash.state.lastViewButton = viewAnchor;
        }

        Dash.state.lastViewURL = url;

        // Send request for view passed by url, renders the response afterwards
        this.request(Dash.state.lastViewURL, data, function (response) {
            Dash.renderResponse(response, this); // this -> xhr
        }, 'get', true);
    },

    // Initialize DashJS setting configs, setting up events and request headers
    init: function (optionsObject = {}) {
        // Bulk set dashboard config
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

        // Binds click events to view anchor nodes
        this.views.forEach(function (element, index) {
            element.addEventListener('click', DashHandlers.handleViewBtnClick, false);
        });

        // if triggerInitialViewFetch config is set to true, trigger click on the first view anchor node
        if (this.config.triggerInitialViewFetch) {
            this.views[0].click();
        }

        // Initialize events
        Dash.events.init();
    },

    /**
     * Binds data contained within DOM elements
     * 
     * @param  {HTMLElement} bindingFrom The source of the data
     * @param  {HTMLElement} bindingTo Placeholder element
     * 
     * @return void
     */
    bindMany: function (bindingFrom, bindingTo) {
        // All elements in from with data-name attributes
        var bindables = bindingFrom.querySelectorAll('[data-name]');

        bindables.forEach(function (node) {
            var name = node.getAttribute('data-name'),
                toElement = bindingTo.querySelector('[data-name=' + name + ']');

            if (toElement) {
                // Corresponding placeholder exists

                if (toElement.matches('input')) {
                    toElement.value = node.value || node.innerText;
                } else {
                    toElement.innerText = node.value || node.innerText;
                }
            }
        });
    },

    /**
     * Init a general ajax request
     * 
     * @param  {String}   url          URL to send request to
     * @param  {FormData} data         A body of data to be sent in the XHR request, preferably FormData
     * @param  {Function} successfn    A callback function to run after AJAX return
     * @param  {String}   method       The HTTP request method to use, such as "GET", "POST", "PUT", "DELETE", etc. Ignored for non-HTTP(S) URLs
     * @param  {Boolean}  viewRequest  Is the request supposed to fetch a view/html
     * 
     * @return XMLHttpRequest
     */
    request: function request(url, data, successfn, method, viewRequest) {
        var type = method.toLowerCase(),
            xhr = new XMLHttpRequest(),
            requestHeaders = this.config.requestHeaders;

        var dashboard = this;

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
                    // Parse response as json 
                    try {
                        var response = JSON.parse(xhr.responseText);
                    } catch (error) {
                        var response = xhr.responseText;
                    }
                    if (typeof successfn === 'function') successfn.call(xhr, response);

                    // Call universal request callback
                    if (!viewRequest && typeof Dash.request.then === 'function') Dash.request.then(response);

                    break;
            }
        };

        // If progress extended call
        xhr.onprogress = function (e) {
            if (viewRequest && typeof dashboard.getView.progress === 'function')
                dashboard.getView.progress(xhr, e, dashboard.state.lastViewButton);

            else if (!viewRequest && typeof dashboard.request.progress === 'function')
                dashboard.request.progress(xhr, e);
        }

        xhr.open(type || 'post', type == 'get' ? url + Dash.utility.encodeURL(data) : url);
        xhr.send((type == 'get') ? null : data || Dash.forms.serializeData(Dash.getActiveForm()));
        return xhr;
    },

    /**
     * Inserts returned view/html into document body
     * 
     * @param mixed response
     * 
     * @return void
     */
    renderResponse: function (response, xhr) {
        /*  window.history.pushState({}, '', Dash.state.lastViewURL);*/

        var contentWrapper = select(Dash.config.content), // Contents Wrapper
            insert = () => {
                return new Promise((resolve, reject) => {
                    contentWrapper.innerHTML = "";
                    contentWrapper.insertAdjacentHTML('afterbegin', response);

                    resolve(response);
                });
            };

        insert().then((response) => {
            Dash.events.init(); // Binds the Action Events
            Dash.forms.init();

            // Call the defined callback after view has been succefully rendered
            if (typeof Dash.getView.then === 'function') Dash.getView.then.call(xhr, Dash.state.lastViewName, contentWrapper, response);
        }).catch(console.log.bind(console));
    },

    reload: function () {
        Dash.state.lastViewButton.click();
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
     * @param {String} form The id of the form to bind onsubmit event to
     * @param {Function} callback Function to execute
     * @param {Array} inputs Array of required input fields
     * 
     * @return {void}
     */
    submit: function (form, callback, inputs = null) {
        this.forms.handlers.push({
            formId: form,
            callback: callback,
            requiredInputs: inputs
        });
    },

    // Forms object
    forms: {
        // Form submit handlers
        handlers: [],

        // Clear and initialize all input fields  
        sanitize: function () {
            var inputs = document.querySelector(Dash.config.activeForm).querySelectorAll('input[type=text], input[type=email], input[type=telephone]')
            inputs.forEach(function (input) {
                input.value = '';
                input.blur();
            });
        },

        // Checks for empty inputs
        checkEmptyInputs: function (nodes) {
            var empty = false;

            nodes.forEach(function (node, index) {
                if (node.value.trim() == "") {
                    empty = true;
                }
            });
            return empty;
        },

        /**
         * Serialize form input elements within a given form
         * 
         * @param {HTMLElement} form The form element
         * @param {Boolean} ALLOW_EMPTY Serialize empty input fields ?
         * 
         * @return FormData
         */
        serializeData: function (form, ALLOW_EMPTY) {
            var serverData = new FormData(),
                inputs = form.querySelectorAll('input[name], select[name], textarea[name]');

            inputs.forEach(function (input) {
                if (input.getAttribute('type') == 'file') {
                    var name = input.getAttribute('name');

                    input[0].files.forEach(function (i, file) {
                        serverData.append(name, file);
                    });
                } else if (input.value != '' || ALLOW_EMPTY) {

                    if (input.getAttribute('type') == 'checkbox' && !input.checked) {} else {
                        serverData.append(input.getAttribute('name'), input.value);
                    }
                }
            });

            return serverData;
        },

        init: function () {
            // Reference the Dash.forms.checkEmptyInputs() method
            var emptyInputs = this.checkEmptyInputs,
                serializeData = this.serializeData;

            this.handlers.forEach(function (item) {
                var formNode = select('#' + item.formId);

                // If the form node is currently within the DOM 
                if (formNode) {
                    // Binds submit event to each form
                    formNode.addEventListener('submit', function (e) {
                        e.preventDefault();

                        if (item.requiredInputs) {
                            // Get required input nodes from DOM
                            var inputNodes = item.requiredInputs.map(input => {
                                return formNode.querySelector('[name=' + input + ']');
                            });

                            if (emptyInputs(inputNodes)) {
                                return {
                                    catch: function (catchCallback) {
                                        catchCallback();
                                    }
                                };
                            }
                        }

                        item.callback.call(formNode, e, serializeData(formNode), formNode.action);
                    });
                }
            });
        },
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
    
    // Resources object
    resources: {
        /**
         * Initiates a POST ajax request to create a resource on server
         * 
         * @param  {String} uri The resouce URI
         * @param  {FormData} formdata data to send as request payload 
         * @param  {Function} fn Callback function to execute after ajax call return
         * 
         * @return void
         */
        create: function (uri, formdata, fn) {
            // Set the url to uri passed or get it form the active form action attr
            var url = uri || Dash.getActiveForm().action,
                callback = function (response) {
                    // this -> XMLHttpRequest
                    fn.call(this, response);
                    reloadIfAutoReload(this);
                };

            Dash.request(url, formdata, callback, 'post');
        },
        update: function (e, route) {
            Dash.bindToMany(false, e, 'input');

            $('.done-btn').unbind('click').click(function (evt) {
                var data = Dash.forms.serializeData(),
                    id = $(e.target).parents('li').data('id');

                for (prop in data) {
                    if (data[prop] == '') delete data[prop];
                }
                data.id = id;

                Dash.request(route, data, false, 'PUT');
            });
        },
        delete: function (resourceId) {

        }
    },

    // Events object
    events: {

        bind: function (event, parentSelector, selector, callback, useCapture = false) {
            // Get the parent node we need as 'this' if target is a child of 'parent node'
            function getParentNode(target, selector) {
                var node = target.parentNode;
                return node.matches(selector) ? node : getParentNode(node, selector);
            }

            var element = document.querySelector(parentSelector);

            element.addEventListener(event, function (e) {
                var target = e.target,
                    match = target.matches(selector),
                    matchesChild = target.matches(selector.trim() + ' *');

                // Register selector to hasOwnEvents array
                if (match || matchesChild) {
                    var node = match ? target : getParentNode(target, selector);
                    callback.call(node, e);
                }
            }, useCapture);
        },

        bindActionEvents: function () {
            var clickableElements = document.querySelectorAll('[data-action]');
            clickableElements.forEach(function (element) {

                // Event handler, handles click events bound via data-action attr
                element.addEventListener('click', function (e) {
                    e.preventDefault();
                    var action = e.currentTarget.getAttribute('data-action');

                    Dash.state.lastClickedActionButton = e.currentTarget;
                    Dash.actions[action].call(Dash.action, e);
                }, false);

                
            });
        },
        // Initialize dashboard events
        init: function () {
            this.bindActionEvents();
        },
    },

    // Utility
    utility: {
        search: function (e, selector, textSelector) {
            var q = $(e.target).val();

            if (!this.search.results) this.search.results = {};
            if (this.search.results[q] != null) {
                this.search.results[q].show()
            } else {
                var elements = $(selector);

                elements.hide();
                elements.each(function () {
                    var link = $(selector).find(textSelector),
                        Regex = new RegExp(q, 'i');

                    if (link.text().match(Regex)) {
                        link.parent(selector).addClass('SEARCH_MATCH');
                    } else {
                        link.parent(selector).removeClass('SEARCH_MATCH');
                    }
                });

                this.search.results[q] = $('.SEARCH_MATCH');

                if (this.search.results[q].length === 0) {
                    $('.void-content-message').show();
                } else {
                    this.search.results[q].show();
                    $('.void-content-message').hide();
                }
            }
        },
        upperCaseFirst: function (string) {
            var firstChar = string.charAt(0),
                newString = firstChar.toUpperCase() + string.slice(1);
            return newString;
        },
        encodeURL: function (data) {
            var query = [];
            for (var key in data) {
                query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
            }
            return (query.length ? '?' + query.join('&') : '');
        },
        showPhoto: function (input, preview) {
            var Reader = new FileReader();

            if (input.files && input.files[0]) Reader.readAsArrayBuffer(input.files[0]);
            else console.log('Files is empty!');

            if (!(/image/i).test(input.files[0].type)) {
                console.log('Files is not an image!');
                return false;
            }

            Reader.onloadend = function () {
                var blob = new Blob([Reader.result]);
                window.URL = window.URL || window.webkitURL;

                // Get image file url and set target src to it
                var blobURL = window.URL.createObjectURL(blob);
                preview.src = blobURL;

                var bytes = document.createElement('input');
                bytes.setAttribute('type', 'hidden');
                bytes.value = Reader.result;

                input.parentNode.insertBefore(bytes, input);

                if (typeof Utility.showPhoto.ready === 'function') {
                    Utility.showPhoto.ready();
                }
            }
        }
    },
};

export default Dash;