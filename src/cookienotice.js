(function ($) {
    'use strict';

    /**
     * CookieNotice
     *
     * @param {object} container
     * @param {object} options
     *
     * @return {$.CookieNotice}
     */
    $.CookieNotice = function (container, options) {
        // Config
        $.extend(true, this.settings = {}, $.CookieNotice.defaults, options);

        // Élements
        this.elements = {
            body: $('body'),
            container: container
        };

        // Variables
        this.config = this.elements.container.attr('data-config');
        this.cookieName = 'cookienotice';

        // Init
        if (this.prepareOptions()) {
            return this.init();
        }

        return this;
    };

    $.CookieNotice.defaults = {
        classes: {
            prefix: 'cookienotice',
            notice: 'notice notice--cookie',
            noticeOpen: 'is-{prefix}-notice-open',
            modal: 'modal modal--cookie',
            modalOpen: 'is-{prefix}-modal-open',
            btnAgree: '{prefix}-agree',
            btnDisagree: '{prefix}-disagree',
            btnCustomize: '{prefix}-customize',
            active: 'is-active',
            inactive: 'is-inactive'
        },
        reload: false,
        summary: 767,
        cookieDuration: 13*30, // 13 mois, durée max pour stocker le consentement
        tabindexStart: 0,
        afterWrapNotice: undefined,
        afterWrapModal: undefined,
        afterEventsHandler: undefined,
        onChangeState: undefined
    };

    $.CookieNotice.services = {};

    $.CookieNotice.prototype = {
        /**
         * Préparation des options utilisateur
         *
         * @return {boolean}
         */
        prepareOptions: function () {
            // Cookies activés ?
            if (!navigator.cookieEnabled) {
                return false;
            }

            // Classes
            this.replacePrefixClass();

            // Éléments
            if (!this.elements.container.length) {
                this.setLog('Container element not found.', 'error');
                return false;
            }

            // Config
            if (this.config !== undefined && this.config !== '') {
                this.config = JSON.parse(this.config);

            } else {
                this.setLog('Attribute "data-config" not found in the container element.', 'error');
                return false;
            }

            return true;
        },

        /**
         * Initialisation
         */
        init: function () {
            this.wrapNotice();

            // Si les états des services n'ont pas pu être récupérés depuis le cookie, c'est qu'il n'y a pas eu encore le consentement
            if (!this.loadStates()) {
                this.setState('all', 'undefined');
                this.notice('show');
            }

            this.wrapModal();
            this.eventsHandler();

            return this;
        },

        /**
         * Destruction
         */
        destroy: function () {
            this.elements.container.remove();
            this.elements.body
                .removeClass(this.settings.classes.noticeOpen)
                .removeClass(this.settings.classes.modalOpen);

            return this;
        },

        /**
         * Wrapper et contenu de la notice
         */
        wrapNotice: function () {
            var btnsCustomize = [];
            var btnCustomizeInBody;
            var btnCustomize;

            // Wrapper
            this.elements.noticeWrapper = $('<div>', {
                'class': this.settings.classes.notice
            });

            // Description
            if (this.config.notice.description !== undefined && this.config.notice.description !== '') {
                this.elements.noticeDescription = $('<p>', {
                    'class': this.settings.classes.prefix + '-notice-description',
                    html   : this.config.notice.description
                });

                this.elements.noticeDescription.appendTo(this.elements.noticeWrapper);
            }

            // Actions
            this.elements.noticeActionsWrapper = $('<div>', {
                'class': this.settings.classes.prefix + '-notice-actions'
            });

            if (this.config.modal !== undefined && this.config.notice.customize !== undefined && this.config.notice.customize !== '') {
                btnCustomize = $('<button>', {
                    'class': this.settings.classes.prefix + '-btn ' + this.settings.classes.prefix + '-btn--secondary ' + this.settings.classes.btnCustomize,
                    html: $('<span>', {
                        html: this.config.notice.customize
                    })
                }).appendTo(this.elements.noticeActionsWrapper);

                btnCustomizeInBody = this.elements.body.find('.' + this.settings.classes.prefix + '-customize');
                btnsCustomize.push(btnCustomize.get(0));

                if (btnCustomizeInBody.length) {
                    btnsCustomize.push(btnCustomizeInBody.get(0));
                }

                this.elements.btnCustomize = $(btnsCustomize);
            }

            if (this.config.notice.agree !== undefined && this.config.notice.agree !== '') {
                this.elements.btnAgree = $('<button>', {
                    'class': this.settings.classes.prefix + '-btn ' + this.settings.classes.prefix + '-btn--primary ' + this.settings.classes.btnAgree,
                    html: $('<span>', {
                        html: this.config.notice.agree
                    })
                }).appendTo(this.elements.noticeActionsWrapper);
            }

            if (this.config.notice.disagree !== undefined && this.config.notice.disagree !== '') {
                this.elements.btnDisagree = $('<button>', {
                    'class': this.settings.classes.prefix + '-btn ' + this.settings.classes.prefix + '-btn--secondary ' + this.settings.classes.btnDisagree,
                    html: $('<span>', {
                        html: this.config.notice.disagree
                    })
                }).appendTo(this.elements.noticeActionsWrapper);
            }

            this.elements.noticeActionsWrapper.appendTo(this.elements.noticeWrapper);
            this.elements.noticeWrapper.appendTo(this.elements.container);

            // User callback
            if (this.settings.afterWrapNotice !== undefined) {
                this.settings.afterWrapNotice.call({
                    cookieNotice: this,
                    elements: this.elements
                });
            }

            return this;
        },

        /**
         * Show/hide notice
         *
         * @param {string} action "show" ou "hide"
         */
        notice: function (action) {
            this.elements.body[(action === 'hide' ? 'remove' : 'add') + 'Class'](this.settings.classes.noticeOpen);
        },

        /**
         * Wrapper et contenu de la modale
         */
        wrapModal: function () {
            var self = this;

            if (self.config.modal !== undefined) {
                // Wrapper
                self.elements.modalWrapper = $('<div>', {
                    'class': self.settings.classes.modal,
                    role: 'dialog',
                    tabindex: '-1'
                });

                // Header
                self.elements.modalHeader = $('<div>', {
                    'class': self.settings.classes.prefix + '-modal-header'
                });

                if (self.config.modal.label !== undefined && self.config.modal.label !== '') {
                    $('<' + (self.config.modal.labelTag || 'p') + '>', {
                        'class': self.settings.classes.prefix + '-modal-label',
                        html: self.config.modal.label
                    }).appendTo(self.elements.modalHeader);

                    self.elements.modalWrapper.attr('aria-label', self.config.modal.label);
                }
                if (self.config.modal.description !== undefined && self.config.modal.description !== '') {
                    $('<div>', {
                        'class': self.settings.classes.prefix + '-modal-description',
                        html: self.config.modal.description
                    }).appendTo(self.elements.modalHeader);
                }
                if (self.config.modal.close !== undefined && self.config.modal.close !== '') {
                    self.elements.modalClose = $('<button>', {
                        'class': self.settings.classes.prefix + '-modal-close',
                        html: $('<span>', {
                            html: self.config.modal.close
                        })
                    }).appendTo(self.elements.modalHeader);
                }

                self.elements.modalHeader.appendTo(self.elements.modalWrapper);

                // Services
                if (self.config.services !== undefined) {
                    var servicesByGroups = {};
                    $.each(this.config.services, function (service, options) {
                        if (service !== 'all') {
                            if (servicesByGroups[options.group] === undefined) {
                                servicesByGroups[options.group] = [];
                            }

                            servicesByGroups[options.group].push(service);
                        }
                    });

                    self.elements.servicesWrapper = $('<div>', {
                        'class': self.settings.classes.prefix + '-services'
                    });
                    
                    var serviceLabelTag = self.config.modal.labelTag || 'p';
                    if (serviceLabelTag.indexOf('h') !== -1) {
                        var serviceLabelTagLevel = parseInt(serviceLabelTag.substring(1));
                        serviceLabelTagLevel++;
                        serviceLabelTag = 'h' + serviceLabelTagLevel;
                    }

                    // All
                    if (self.config.services.all !== undefined) {
                        self.elements.serviceAllWrapper = $('<div>', {
                            'class': self.settings.classes.prefix + '-service ' + self.settings.classes.prefix + '-service--all',
                            'data-service': 'all'
                        });

                        $('<' + serviceLabelTag + '>', {
                            'class': self.settings.classes.prefix + '-service-all-label',
                            html   : self.config.services.all.label
                        }).appendTo(self.elements.serviceAllWrapper);

                        self.wrapServiceActions('all').appendTo(self.elements.serviceAllWrapper);
                        self.elements.serviceAllWrapper.appendTo(self.elements.servicesWrapper);
                    }

                    // Groupe => Services
                    var groupsList = $('<ul>');
                    var groupIndex = 0;
                    var groupLength = Object.keys(servicesByGroups).length;
                    $.each(servicesByGroups, function (group, services) {
                        var groupWrapper = $('<li>', {
                            'class': self.settings.classes.prefix + '-group ' + self.settings.classes.prefix + '-group--' + group
                        }).appendTo(groupsList);

                        if (self.config.groups[group].label !== undefined && self.config.groups[group].label !== '') {
                            $('<' + serviceLabelTag + '>', {
                                'class': self.settings.classes.prefix + '-group--label',
                                html: self.config.groups[group].label
                            }).appendTo(groupWrapper);
                        }
                        if (self.config.groups[group].description !== undefined && self.config.groups[group].description !== '') {
                            $('<p>', {
                                'class': self.settings.classes.prefix + '-group--description',
                                html: self.config.groups[group].description
                            }).appendTo(groupWrapper);
                        }

                        if (services.length) {
                            var servicesList = $('<ul>');

                            $.each(services, function (i, service) {
                                var serviceWrapper = $('<li>', {
                                    'class': self.settings.classes.prefix + '-service ' + self.settings.classes.prefix + '-service--' + service,
                                    'data-service': service
                                });
                                var serviceLabelWrapper = $('<div>', {
                                    'class': self.settings.classes.prefix + '-service-label-wrapper'
                                });

                                // Label
                                var serviceLabel;
                                var serviceLabelAttributes = {
                                    'class': self.settings.classes.prefix + '-service-label',
                                    html: self.config.services[service].label
                                };
                                if (self.config.services[service].url !== undefined && self.config.services[service].url !== '') {
                                    serviceLabelAttributes['href'] = self.config.services[service].url;
                                    serviceLabelAttributes['tabindex'] = self.settings.tabindexStart;
                                    serviceLabel = $('<a>', serviceLabelAttributes);
                                } else {
                                    serviceLabel = $('<span>', serviceLabelAttributes);
                                }
                                serviceLabel.appendTo(serviceLabelWrapper);

                                // Description
                                if (self.config.services[service].description !== undefined && self.config.services[service].description !== '') {
                                    var serviceDescription = $('<p>', {
                                        'class': self.settings.classes.prefix + '-service-description',
                                        html: self.config.services[service].description
                                    });
                                    serviceDescription.appendTo(serviceLabelWrapper);
                                }

                                // Last service
                                if (groupIndex === groupLength-1 && i === services.length-1) {
                                    serviceWrapper.addClass('is-last');
                                }

                                serviceLabelWrapper.appendTo(serviceWrapper);
                                self.wrapServiceActions(service).appendTo(serviceWrapper);
                                serviceWrapper.appendTo(servicesList);
                            });

                            servicesList.appendTo(groupWrapper);
                        }

                        groupIndex++;
                    });

                    groupsList.appendTo(self.elements.servicesWrapper);
                    self.elements.servicesWrapper.appendTo(self.elements.modalWrapper);
                }

                self.elements.modalWrapper.appendTo(self.elements.container);

                // User callback
                if (self.settings.afterWrapModal !== undefined) {
                    self.settings.afterWrapModal.call({
                        cookieNotice: self,
                        elements: self.elements
                    });
                }
            }

            // Overlay
            self.elements.modalOverlay = $('<div>', {
                'class': self.settings.classes.prefix + '-modal-overlay'
            }).appendTo(self.elements.container);

            return self;
        },

        /**
         * Wrapper des actions par service
         *
         * @param {string} service
         */
        wrapServiceActions: function (service) {
            var self = this;
            var state = self.getState(service);
            var actions = $('<div>', {
                'class': self.settings.classes.prefix + '-service-actions'
            });

            if (self.config.services.all['agree'] !== undefined && self.config.services.all['agree'] !== '' && self.config.services.all['disagree'] !== undefined && self.config.services.all['disagree'] !== '') {
                if (service === 'all') {
                    var count = 0;
                    var none = false;
                    $.each($.CookieNotice.services, function (allService, allState) {
                        if (allState === true) {
                            count++;
                        }
                        if (allState === 'undefined') {
                            none = true;
                        }
                    });

                    var checkedState = count === Object.keys($.CookieNotice.services).length;
                    state = none ? 'undefined' : (count > 0 && !checkedState ? 'undefined' : checkedState);
                }

                // Switch
                var serviceActionWrapper = $('<span>', {
                    'class': self.settings.classes.prefix + '-service-action ' + (state === 'undefined' ? '' : (state ? self.settings.classes.active : self.settings.classes.inactive))
                });
                $('<span>', {
                    'class': self.settings.classes.prefix + '-service-action-input',
                    tabindex: self.settings.tabindexStart,
                    html: $('<input>', {
                        type: 'checkbox',
                        'class': self.settings.classes.prefix + '-service-action-input--checkbox',
                        id: self.settings.classes.prefix + '-service-action--' + service,
                        name: service,
                        value: state,
                        checked: state === true
                    })
                }).appendTo(serviceActionWrapper);
                $('<label>', {
                    for: self.settings.classes.prefix + '-service-action--' + service,
                    'class': self.settings.classes.prefix + '-service-action-label',
                    html: state === 'undefined' ? self.config.services.all.customize : self.config.services.all[!state ? 'disagree' : 'agree'],
                    'aria-hidden': true
                }).appendTo(serviceActionWrapper);

                serviceActionWrapper.appendTo(actions);
            }

            return actions;
        },

        /**
         * Show/hide modal
         *
         * @param {string} action "show" ou "hide"
         */
        modal: function (action) {
            var self = this;

            self.elements.body[(action === 'hide' ? 'remove' : 'add') + 'Class'](self.settings.classes.modalOpen);

            if (action === 'show') {
                setTimeout(function () {
                    self.elements.modalWrapper.focus();
                }, 100);
            }

            if (action === 'hide' && self.elements.openBtn !== undefined && self.elements.openBtn.length) {
                setTimeout(function () {
                    self.elements.openBtn = undefined;
                }, 200);
            }
        },

        /**
         * Gestionnaire d'événements
         */
        eventsHandler: function () {
            var self = this;
            var closeModal;

            // Notice description
            if (self.settings.summary !== false && self.elements.noticeDescription.length && self.config.notice.summary !== undefined && self.config.notice.summary !== '' && $(window).width() <= self.settings.summary) {
                self.elements.noticeDescription.html(self.config.notice.summary);

                self.elements.noticeDescription.on('click', function (event) {
                    if (!$(event.target).is('a') && self.elements.noticeDescription.html() !== self.config.notice.description) {
                        self.elements.noticeDescription.html(self.config.notice.description);
                    }
                });
            }

            // Bouton "ok"
            if (self.elements.btnAgree !== undefined && self.elements.btnAgree.length) {
                self.elements.btnAgree.one('click.cookienotice.btnAgree', function () {
                    self.agree();
                    self.notice('hide');

                    if (self.settings.reload) {
                        self.reload();

                    } else if (self.elements.serviceAction.length) {
                        self.elements.serviceAction.each(function (i, btn) {
                            btn = $(btn);

                            if (btn.attr('data-action') === 'agree') {
                                btn.addClass(self.settings.classes.active);
                            }
                        });
                    }
                });
            }

            // Button disagree
            if (self.elements.btnDisagree !== undefined && self.elements.btnDisagree.length) {
                self.elements.btnDisagree.one('click.cookienotice.btnDisagree', function () {
                    self.disagree();
                    self.notice('hide');

                    if (self.settings.reload) {
                        self.reload();

                    } else if (self.elements.serviceAction.length) {
                        self.elements.serviceAction.each(function (i, btn) {
                            btn = $(btn);

                            if (btn.attr('data-action') === 'disagree') {
                                btn.addClass(self.settings.classes.active);
                            }
                        });
                    }
                });
            }

            // Bouton "customize"
            if (self.elements.btnCustomize !== undefined && self.elements.btnCustomize.length) {
                self.elements.btnCustomize.on('click.cookienotice.btnCustomize keyup.cookienotice.btnCustomize', function (event) {
                    if (event.type === 'click' || event.type === 'keyup' && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        self.modal('show');
                        self.elements.openBtn = $(event.currentTarget);

                        if (!self.getCookie(self.cookieName)) {
                            self.notice('hide');
                        }
                    }
                });
            }

            // Modal
            if (self.config.modal !== undefined) {
                closeModal = function (event) {
                    if (event.type === 'click' || (event.type === 'keydown' && event.key === 'Escape')) {
                        // Focus
                        if (!self.settings.reload && self.elements.openBtn !== undefined && self.elements.openBtn.length) {
                            event.preventDefault();
                            setTimeout(function () {
                                self.elements.openBtn.focus();
                            }, 100);
                        }

                        self.modal('hide');

                        if (!self.getCookie(self.cookieName)) {
                            self.notice('show');
                        }

                        self.reload();
                    }
                };

                // Close
                if (self.elements.modalClose.length) {
                    self.elements.modalClose.on({
                        'click.cookienotice.modalClose': closeModal,
                        'keydown.cookienotice.modalClose': function (event) {
                            if (event.key === 'Tab' && event.shiftKey) {
                                event.preventDefault();
                                self.elements.servicesWrapper.find('.is-last .' + self.settings.classes.prefix + '-service-action-input').focus();
                            }
                        }
                    });
                }

                // Overlay
                if (self.elements.modalOverlay.length) {
                    self.elements.modalOverlay.on('click.cookienotice.modalOverlay', closeModal);
                }

                // Escape
                $(document).on('keydown.cookienotice.modalEscape', closeModal);

                // States
                self.elements.serviceAction = self.elements.servicesWrapper.find('.' + self.settings.classes.prefix + '-service-action');
                self.elements.serviceAction.on('click.cookienotice.serviceAction keydown.cookienotice.serviceAction', function (event) {
                    var btn = $(event.currentTarget);
                    var serviceElement = btn.closest('.' + self.settings.classes.prefix + '-service');
                    if (event.key === ' ') {
                        event.preventDefault();
                    }

                    if (event.type === 'click' || event.type === 'keydown' && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
                        var input = btn.find('input');
                        var state = input.prop('checked');
                        var label = btn.find('label');
                        var service = serviceElement.attr('data-service');

                        if (service !== undefined) {
                            // Btn state
                            btn[(state ? 'remove' : 'add') + 'Class'](self.settings.classes.active);
                            btn[(state ? 'add' : 'remove') + 'Class'](self.settings.classes.inactive);
                            input.prop('checked', !state);
                            label.html(self.config.services.all[state ? 'disagree' : 'agree']);

                            // All
                            if (service === 'all') {
                                self.elements.serviceAction.each(function (i, item) {
                                    item = $(item);
                                    item[(state ? 'remove' : 'add') + 'Class'](self.settings.classes.active);
                                    item[(state ? 'add' : 'remove') + 'Class'](self.settings.classes.inactive);
                                    item.find('input').prop('checked', !state);
                                    item.find('label').html(self.config.services.all[state ? 'disagree' : 'agree']);
                                });
                            } else {
                                var allItem = self.elements.serviceAllWrapper.find('.' + self.settings.classes.prefix + '-service-action');
                                allItem.removeClass(self.settings.classes.active);
                                allItem.removeClass(self.settings.classes.inactive);
                                allItem.find('input').prop('checked', false);
                                allItem.find('label').html(self.config.services.all.customize);
                            }

                            // Service state
                            self.setState(service, !state);
                        }
                    }

                    // Repeat tabindex
                    if (event.type === 'keydown' && event.key === 'Tab' && !event.shiftKey && serviceElement.hasClass('is-last')) {
                        event.preventDefault();
                        self.elements.modalClose.focus();
                    }
                });
            }

            // User callback
            if (self.settings.afterEventsHandler !== undefined) {
                self.settings.afterEventsHandler.call({
                    cookieNotice: self,
                    elements: self.elements
                });
            }

            return self;
        },

        /**
         * Accepte un service
         *
         * @param {string=undefined} service
         */
        agree: function (service) {
            service = service || 'all';

            return this.setState(service, true);
        },

        /**
         * Refuse un service
         *
         * @param {string=undefined} service
         */
        disagree: function (service) {
            service = service || 'all';

            return this.setState(service, false);
        },

        /**
         * Définition de l'état du service
         *
         * @param {string} service
         * @param {boolean} state
         */
        setState: function (service, state) {
            // Variables globales
            if (service === 'all' && this.config.services !== undefined) {
                $.each(this.config.services, function (configService) {
                    if (configService !== 'all') {
                        $.CookieNotice.services[configService] = state;
                    }
                });
            } else {
                $.CookieNotice.services[service] = state;
            }

            if (state !== 'undefined') {
                // Cookie
                this.setCookie(this.cookieName, JSON.stringify($.CookieNotice.services), this.settings.cookieDuration);

                // User callback
                if (this.settings.onChangeState !== undefined) {
                    this.settings.onChangeState.call({
                        cookieNotice: this,
                        services: $.CookieNotice.services,
                        service: service,
                        state: state
                    });
                }
            }

            return this;
        },

        /**
         * Chargement des états des services depuis le cookie
         *
         * @return {boolean|object} False si le cookie n'existe pas ou object avec l'état de chaque service s'il existe
         */
        loadStates: function () {
            var states = this.getCookie(this.cookieName);

            if (states) {
                states = JSON.parse(states);

                $.each(states, function (service, state) {
                    $.CookieNotice.services[service] = state;
                });

                return states;
            }

            return false;
        },

        /**
         * Récupération de l'état du service. Si le choix n'a pas été fait, l'état retourné est "undefined"
         *
         * @param {string} service
         * @return {boolean|string}
         */
        getState: function (service) {
            if ($.CookieNotice.services[service] !== undefined) {
                return $.CookieNotice.services[service];
            }

            return 'undefined';
        },

        /**
         * Détermine si un service est autorisé
         *
         * @param {string} service
         * @return {boolean}
         */
        isAllowed: function (service) {
            return this.getState(service) === true;
        },

        /**
         * Détermine si il y a eu un consentement (accepté ou non)
         *
         * @return {boolean}
         */
        hasConsent: function () {
            return !!this.getCookie(this.cookieName);
        },

        /**
         * Rechargement de la page
         */
        reload: function () {
            if (this.settings.reload) {
                window.location.reload();
            }
        },

        /**
         * Utils
         */
        getCookie: function (name) {
            var regex = new RegExp('(?:; )?' + name + '=([^;]*);?');

            return regex.test(document.cookie) ? decodeURIComponent(RegExp['$1']) : null;
        },
        setCookie: function (name, value, duration, path) {
            var today = new Date();
            var expires = new Date();
            path = path || '/';

            expires.setTime(today.getTime() + (duration*24*60*60*1000));
            document.cookie = name + '=' + value + ';expires=' + expires.toGMTString() + ';path=' + path + ';';
        },
        removeCookie: function (name, path) {
            return this.setCookie(name, '', -1, path);
        },
        setLog: function (log, type) {
            type = type || 'log';

            console[type]('CookieNotice: ' + log);
        },
        replacePrefixClass: function () {
            var self = this;

            $.each(self.settings.classes, function (key, value) {
                if (typeof value === 'string') {
                    self.settings.classes[key] = value.replace(/{prefix}/, self.settings.classes.prefix);
                }
            });

            return self;
        }
    };

    $.fn.cookieNotice = function (options) {
        return new $.CookieNotice($(this), options);
    };
})(jQuery);