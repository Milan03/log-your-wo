(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["home-home-module"],{

/***/ "./node_modules/raw-loader/dist/cjs.js!./src/app/routes/home/home/home.component.html":
/*!********************************************************************************************!*\
  !*** ./node_modules/raw-loader/dist/cjs.js!./src/app/routes/home/home/home.component.html ***!
  \********************************************************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = ("<div class=\"home-container\">\r\n    <div class=\"jumbotron\">\r\n        <div class=\"row\">\r\n            <div class=\"col-xl-3 col-lg-4\">\r\n                <div class=\"text-center\">\r\n                    <img alt=\"Log Your Workout\" class=\"img-fluid home-logo\" src=\"assets/img/log-your-wo-logo-single-black.svg\" />\r\n                </div>\r\n            </div>\r\n            <div class=\"col-xl-9 col-lg-8 home-text\">\r\n                <h1 class=\"home-text-big\">{{ 'global.LogYourWorkout' | translate }}</h1>\r\n                <p class=\"lead\"><small>{{ 'global.LogYourWorkoutDescription' | translate }}</small></p>\r\n                <p><a class=\"btn btn-primary btn-lg\" href=\"https://angular.io/\" target=\"_blank\">Learn more</a></p>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div class=\"row\">\r\n        <div class=\"col-lg-4\">\r\n            <div class=\"card b\">\r\n                <button class=\"btn-transparent\" (click)=\"navigateToSimpleLogEntry()\">\r\n                    <div class=\"card-header\">\r\n                        <h3>{{ 'log-entry.SimpleLog' | translate }}</h3>\r\n                    </div>\r\n                    <div class=\"card-body\">\r\n                        {{ 'log-entry.SimpleLogDescription' | translate }}\r\n                    </div>\r\n                </button>\r\n            </div>\r\n        </div>\r\n        <!-- <div class=\"col-lg-4\">\r\n            <div class=\"card b\">\r\n                <div class=\"card-header\">\r\n                    <h3>Router</h3>\r\n                </div>\r\n                <div class=\"card-body\">\r\n                    Powerful and modern routes definitions. Easily declare routes and nested routes with components association.\r\n                </div>\r\n            </div>\r\n        </div>\r\n        <div class=\"col-lg-4\">\r\n            <div class=\"card b\">\r\n                <div class=\"card-header\">\r\n                    <h3>Generators</h3>\r\n                </div>\r\n                <div class=\"card-body\">\r\n                    Angular-CLI tool provides generators to create components, services, directives and pipe from the command line.\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div class=\"row\">\r\n        <div class=\"col-lg-4\">\r\n            <div class=\"card b\">\r\n                <div class=\"card-header\">\r\n                    <h3>Modularized</h3>\r\n                </div>\r\n                <div class=\"card-body\">\r\n                    This project has been carefully designed to provide modules for Core, Layout, Shared and Routed components.\r\n                </div>\r\n            </div>\r\n        </div>\r\n        <div class=\"col-lg-4\">\r\n            <div class=\"card b\">\r\n                <div class=\"card-header\">\r\n                    <h3>Environments</h3>\r\n                </div>\r\n                <div class=\"card-body\">\r\n                    Ready to work with multiple environments, from first stage development through test and production.\r\n                </div>\r\n            </div>\r\n        </div>\r\n        <div class=\"col-lg-4\">\r\n            <div class=\"card b\">\r\n                <div class=\"card-header\">\r\n                    <h3>Style Guide</h3>\r\n                </div>\r\n                <div class=\"card-body\">\r\n                    Better practices for Code organization and Project structure based on the official Angular style guide.\r\n                </div>\r\n            </div>\r\n        </div> -->\r\n    </div>\r\n</div>");

/***/ }),

/***/ "./src/app/routes/home/home.module.ts":
/*!********************************************!*\
  !*** ./src/app/routes/home/home.module.ts ***!
  \********************************************/
/*! exports provided: HomeModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "HomeModule", function() { return HomeModule; });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
/* harmony import */ var _home_home_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./home/home.component */ "./src/app/routes/home/home/home.component.ts");
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/__ivy_ngcc__/fesm2015/router.js");
/* harmony import */ var _shared_shared_module__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../shared/shared.module */ "./src/app/shared/shared.module.ts");





const routes = [
    { path: '', component: _home_home_component__WEBPACK_IMPORTED_MODULE_2__["HomeComponent"] },
];
let HomeModule = class HomeModule {
};
HomeModule = Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"])([
    Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["NgModule"])({
        imports: [
            _angular_router__WEBPACK_IMPORTED_MODULE_3__["RouterModule"].forChild(routes),
            _shared_shared_module__WEBPACK_IMPORTED_MODULE_4__["SharedModule"]
        ],
        declarations: [_home_home_component__WEBPACK_IMPORTED_MODULE_2__["HomeComponent"]],
        exports: [
            _angular_router__WEBPACK_IMPORTED_MODULE_3__["RouterModule"]
        ]
    })
], HomeModule);



/***/ }),

/***/ "./src/app/routes/home/home/home.component.scss":
/*!******************************************************!*\
  !*** ./src/app/routes/home/home/home.component.scss ***!
  \******************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = (".btn-transparent {\n  background: none;\n  color: inherit;\n  border: none;\n  padding: 0;\n  font: inherit;\n  cursor: pointer;\n  outline: inherit;\n  text-align: left;\n}\n\n.text-danger {\n  font-size: 12px;\n  color: #ff6358;\n}\n\n.div-inherit {\n  display: inherit;\n}\n\n@media only screen and (min-width: 1200px) {\n  .div-inherit {\n    margin-left: 50px;\n  }\n}\n\n.home-container {\n  margin: 0 auto;\n  margin-top: 65px;\n  max-width: 960px;\n}\n\n.home-container button:hover, .home-container button:active, .home-container button:focus {\n  background-color: rgba(236, 236, 236, 0.5);\n}\n\n.home-container .home-logo {\n  width: 240px;\n}\n\n.home-container .home-text {\n  text-align: center;\n}\n\n@media (min-width: 992px) {\n  .home-container .home-text {\n    text-align: left;\n  }\n}\n\n.home-container .home-text-big {\n  font-size: 3.9375rem;\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvc2hhcmVkL3N0eWxlcy9jb21tb24uc2NzcyIsInNyYy9hcHAvcm91dGVzL2hvbWUvaG9tZS9ob21lLmNvbXBvbmVudC5zY3NzIiwic3JjL2FwcC9zaGFyZWQvc3R5bGVzL2Jvb3RzdHJhcC9taXhpbnMvX2JyZWFrcG9pbnRzLnNjc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFDSSxnQkFBQTtFQUNBLGNBQUE7RUFDQSxZQUFBO0VBQ0EsVUFBQTtFQUNBLGFBQUE7RUFDQSxlQUFBO0VBQ0EsZ0JBQUE7RUFDQSxnQkFBQTtBQ0NKOztBREVBO0VBQ0ksZUFBQTtFQUNBLGNBQUE7QUNDSjs7QURFQTtFQUNJLGdCQUFBO0FDQ0o7O0FERUE7RUFDSTtJQUNJLGlCQUFBO0VDQ047QUFDRjs7QUFsQkE7RUFDSSxjQUFBO0VBQ0EsZ0JBQUE7RUFDQSxnQkFBQTtBQW9CSjs7QUFsQkk7RUFDSSwwQ0FBQTtBQW9CUjs7QUFqQkk7RUFDSSxZQUFBO0FBbUJSOztBQWhCSTtFQUNJLGtCQUFBO0FBa0JSOztBQ3NCSTtFRHpDQTtJQUdRLGdCQUFBO0VBb0JWO0FBQ0Y7O0FBbEJJO0VBQ0ksb0JBQUE7QUFvQlIiLCJmaWxlIjoic3JjL2FwcC9yb3V0ZXMvaG9tZS9ob21lL2hvbWUuY29tcG9uZW50LnNjc3MiLCJzb3VyY2VzQ29udGVudCI6WyIuYnRuLXRyYW5zcGFyZW50IHtcclxuICAgIGJhY2tncm91bmQ6IG5vbmU7XHJcbiAgICBjb2xvcjogaW5oZXJpdDtcclxuICAgIGJvcmRlcjogbm9uZTtcclxuICAgIHBhZGRpbmc6IDA7XHJcbiAgICBmb250OiBpbmhlcml0O1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgb3V0bGluZTogaW5oZXJpdDtcclxuICAgIHRleHQtYWxpZ246IGxlZnQ7XHJcbn1cclxuXHJcbi50ZXh0LWRhbmdlciB7XHJcbiAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICBjb2xvcjogI2ZmNjM1ODtcclxufVxyXG5cclxuLmRpdi1pbmhlcml0IHtcclxuICAgIGRpc3BsYXk6IGluaGVyaXQ7XHJcbn1cclxuXHJcbkBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1pbi13aWR0aDogMTIwMHB4KSB7XHJcbiAgICAuZGl2LWluaGVyaXQge1xyXG4gICAgICAgIG1hcmdpbi1sZWZ0OiA1MHB4O1xyXG4gICAgfVxyXG59IiwiLmJ0bi10cmFuc3BhcmVudCB7XG4gIGJhY2tncm91bmQ6IG5vbmU7XG4gIGNvbG9yOiBpbmhlcml0O1xuICBib3JkZXI6IG5vbmU7XG4gIHBhZGRpbmc6IDA7XG4gIGZvbnQ6IGluaGVyaXQ7XG4gIGN1cnNvcjogcG9pbnRlcjtcbiAgb3V0bGluZTogaW5oZXJpdDtcbiAgdGV4dC1hbGlnbjogbGVmdDtcbn1cblxuLnRleHQtZGFuZ2VyIHtcbiAgZm9udC1zaXplOiAxMnB4O1xuICBjb2xvcjogI2ZmNjM1ODtcbn1cblxuLmRpdi1pbmhlcml0IHtcbiAgZGlzcGxheTogaW5oZXJpdDtcbn1cblxuQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWluLXdpZHRoOiAxMjAwcHgpIHtcbiAgLmRpdi1pbmhlcml0IHtcbiAgICBtYXJnaW4tbGVmdDogNTBweDtcbiAgfVxufVxuLmhvbWUtY29udGFpbmVyIHtcbiAgbWFyZ2luOiAwIGF1dG87XG4gIG1hcmdpbi10b3A6IDY1cHg7XG4gIG1heC13aWR0aDogOTYwcHg7XG59XG4uaG9tZS1jb250YWluZXIgYnV0dG9uOmhvdmVyLCAuaG9tZS1jb250YWluZXIgYnV0dG9uOmFjdGl2ZSwgLmhvbWUtY29udGFpbmVyIGJ1dHRvbjpmb2N1cyB7XG4gIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMjM2LCAyMzYsIDIzNiwgMC41KTtcbn1cbi5ob21lLWNvbnRhaW5lciAuaG9tZS1sb2dvIHtcbiAgd2lkdGg6IDI0MHB4O1xufVxuLmhvbWUtY29udGFpbmVyIC5ob21lLXRleHQge1xuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG59XG5AbWVkaWEgKG1pbi13aWR0aDogOTkycHgpIHtcbiAgLmhvbWUtY29udGFpbmVyIC5ob21lLXRleHQge1xuICAgIHRleHQtYWxpZ246IGxlZnQ7XG4gIH1cbn1cbi5ob21lLWNvbnRhaW5lciAuaG9tZS10ZXh0LWJpZyB7XG4gIGZvbnQtc2l6ZTogMy45Mzc1cmVtO1xufSIsIi8vIEJyZWFrcG9pbnQgdmlld3BvcnQgc2l6ZXMgYW5kIG1lZGlhIHF1ZXJpZXMuXHJcbi8vXHJcbi8vIEJyZWFrcG9pbnRzIGFyZSBkZWZpbmVkIGFzIGEgbWFwIG9mIChuYW1lOiBtaW5pbXVtIHdpZHRoKSwgb3JkZXIgZnJvbSBzbWFsbCB0byBsYXJnZTpcclxuLy9cclxuLy8gICAgKHhzOiAwLCBzbTogNTc2cHgsIG1kOiA3NjhweCwgbGc6IDk5MnB4LCB4bDogMTIwMHB4KVxyXG4vL1xyXG4vLyBUaGUgbWFwIGRlZmluZWQgaW4gdGhlIGAkZ3JpZC1icmVha3BvaW50c2AgZ2xvYmFsIHZhcmlhYmxlIGlzIHVzZWQgYXMgdGhlIGAkYnJlYWtwb2ludHNgIGFyZ3VtZW50IGJ5IGRlZmF1bHQuXHJcblxyXG4vLyBOYW1lIG9mIHRoZSBuZXh0IGJyZWFrcG9pbnQsIG9yIG51bGwgZm9yIHRoZSBsYXN0IGJyZWFrcG9pbnQuXHJcbi8vXHJcbi8vICAgID4+IGJyZWFrcG9pbnQtbmV4dChzbSlcclxuLy8gICAgbWRcclxuLy8gICAgPj4gYnJlYWtwb2ludC1uZXh0KHNtLCAoeHM6IDAsIHNtOiA1NzZweCwgbWQ6IDc2OHB4LCBsZzogOTkycHgsIHhsOiAxMjAwcHgpKVxyXG4vLyAgICBtZFxyXG4vLyAgICA+PiBicmVha3BvaW50LW5leHQoc20sICRicmVha3BvaW50LW5hbWVzOiAoeHMgc20gbWQgbGcgeGwpKVxyXG4vLyAgICBtZFxyXG5AZnVuY3Rpb24gYnJlYWtwb2ludC1uZXh0KCRuYW1lLCAkYnJlYWtwb2ludHM6ICRncmlkLWJyZWFrcG9pbnRzLCAkYnJlYWtwb2ludC1uYW1lczogbWFwLWtleXMoJGJyZWFrcG9pbnRzKSkge1xyXG4gICRuOiBpbmRleCgkYnJlYWtwb2ludC1uYW1lcywgJG5hbWUpO1xyXG4gIEByZXR1cm4gaWYoJG4gIT0gbnVsbCBhbmQgJG4gPCBsZW5ndGgoJGJyZWFrcG9pbnQtbmFtZXMpLCBudGgoJGJyZWFrcG9pbnQtbmFtZXMsICRuICsgMSksIG51bGwpO1xyXG59XHJcblxyXG4vLyBNaW5pbXVtIGJyZWFrcG9pbnQgd2lkdGguIE51bGwgZm9yIHRoZSBzbWFsbGVzdCAoZmlyc3QpIGJyZWFrcG9pbnQuXHJcbi8vXHJcbi8vICAgID4+IGJyZWFrcG9pbnQtbWluKHNtLCAoeHM6IDAsIHNtOiA1NzZweCwgbWQ6IDc2OHB4LCBsZzogOTkycHgsIHhsOiAxMjAwcHgpKVxyXG4vLyAgICA1NzZweFxyXG5AZnVuY3Rpb24gYnJlYWtwb2ludC1taW4oJG5hbWUsICRicmVha3BvaW50czogJGdyaWQtYnJlYWtwb2ludHMpIHtcclxuICAkbWluOiBtYXAtZ2V0KCRicmVha3BvaW50cywgJG5hbWUpO1xyXG4gIEByZXR1cm4gaWYoJG1pbiAhPSAwLCAkbWluLCBudWxsKTtcclxufVxyXG5cclxuLy8gTWF4aW11bSBicmVha3BvaW50IHdpZHRoLiBOdWxsIGZvciB0aGUgbGFyZ2VzdCAobGFzdCkgYnJlYWtwb2ludC5cclxuLy8gVGhlIG1heGltdW0gdmFsdWUgaXMgY2FsY3VsYXRlZCBhcyB0aGUgbWluaW11bSBvZiB0aGUgbmV4dCBvbmUgbGVzcyAwLjAycHhcclxuLy8gdG8gd29yayBhcm91bmQgdGhlIGxpbWl0YXRpb25zIG9mIGBtaW4tYCBhbmQgYG1heC1gIHByZWZpeGVzIGFuZCB2aWV3cG9ydHMgd2l0aCBmcmFjdGlvbmFsIHdpZHRocy5cclxuLy8gU2VlIGh0dHBzOi8vd3d3LnczLm9yZy9UUi9tZWRpYXF1ZXJpZXMtNC8jbXEtbWluLW1heFxyXG4vLyBVc2VzIDAuMDJweCByYXRoZXIgdGhhbiAwLjAxcHggdG8gd29yayBhcm91bmQgYSBjdXJyZW50IHJvdW5kaW5nIGJ1ZyBpbiBTYWZhcmkuXHJcbi8vIFNlZSBodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTc4MjYxXHJcbi8vXHJcbi8vICAgID4+IGJyZWFrcG9pbnQtbWF4KHNtLCAoeHM6IDAsIHNtOiA1NzZweCwgbWQ6IDc2OHB4LCBsZzogOTkycHgsIHhsOiAxMjAwcHgpKVxyXG4vLyAgICA3NjcuOThweFxyXG5AZnVuY3Rpb24gYnJlYWtwb2ludC1tYXgoJG5hbWUsICRicmVha3BvaW50czogJGdyaWQtYnJlYWtwb2ludHMpIHtcclxuICAkbmV4dDogYnJlYWtwb2ludC1uZXh0KCRuYW1lLCAkYnJlYWtwb2ludHMpO1xyXG4gIEByZXR1cm4gaWYoJG5leHQsIGJyZWFrcG9pbnQtbWluKCRuZXh0LCAkYnJlYWtwb2ludHMpIC0gLjAyLCBudWxsKTtcclxufVxyXG5cclxuLy8gUmV0dXJucyBhIGJsYW5rIHN0cmluZyBpZiBzbWFsbGVzdCBicmVha3BvaW50LCBvdGhlcndpc2UgcmV0dXJucyB0aGUgbmFtZSB3aXRoIGEgZGFzaCBpbiBmcm9udC5cclxuLy8gVXNlZnVsIGZvciBtYWtpbmcgcmVzcG9uc2l2ZSB1dGlsaXRpZXMuXHJcbi8vXHJcbi8vICAgID4+IGJyZWFrcG9pbnQtaW5maXgoeHMsICh4czogMCwgc206IDU3NnB4LCBtZDogNzY4cHgsIGxnOiA5OTJweCwgeGw6IDEyMDBweCkpXHJcbi8vICAgIFwiXCIgIChSZXR1cm5zIGEgYmxhbmsgc3RyaW5nKVxyXG4vLyAgICA+PiBicmVha3BvaW50LWluZml4KHNtLCAoeHM6IDAsIHNtOiA1NzZweCwgbWQ6IDc2OHB4LCBsZzogOTkycHgsIHhsOiAxMjAwcHgpKVxyXG4vLyAgICBcIi1zbVwiXHJcbkBmdW5jdGlvbiBicmVha3BvaW50LWluZml4KCRuYW1lLCAkYnJlYWtwb2ludHM6ICRncmlkLWJyZWFrcG9pbnRzKSB7XHJcbiAgQHJldHVybiBpZihicmVha3BvaW50LW1pbigkbmFtZSwgJGJyZWFrcG9pbnRzKSA9PSBudWxsLCBcIlwiLCBcIi0jeyRuYW1lfVwiKTtcclxufVxyXG5cclxuLy8gTWVkaWEgb2YgYXQgbGVhc3QgdGhlIG1pbmltdW0gYnJlYWtwb2ludCB3aWR0aC4gTm8gcXVlcnkgZm9yIHRoZSBzbWFsbGVzdCBicmVha3BvaW50LlxyXG4vLyBNYWtlcyB0aGUgQGNvbnRlbnQgYXBwbHkgdG8gdGhlIGdpdmVuIGJyZWFrcG9pbnQgYW5kIHdpZGVyLlxyXG5AbWl4aW4gbWVkaWEtYnJlYWtwb2ludC11cCgkbmFtZSwgJGJyZWFrcG9pbnRzOiAkZ3JpZC1icmVha3BvaW50cykge1xyXG4gICRtaW46IGJyZWFrcG9pbnQtbWluKCRuYW1lLCAkYnJlYWtwb2ludHMpO1xyXG4gIEBpZiAkbWluIHtcclxuICAgIEBtZWRpYSAobWluLXdpZHRoOiAkbWluKSB7XHJcbiAgICAgIEBjb250ZW50O1xyXG4gICAgfVxyXG4gIH0gQGVsc2Uge1xyXG4gICAgQGNvbnRlbnQ7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBNZWRpYSBvZiBhdCBtb3N0IHRoZSBtYXhpbXVtIGJyZWFrcG9pbnQgd2lkdGguIE5vIHF1ZXJ5IGZvciB0aGUgbGFyZ2VzdCBicmVha3BvaW50LlxyXG4vLyBNYWtlcyB0aGUgQGNvbnRlbnQgYXBwbHkgdG8gdGhlIGdpdmVuIGJyZWFrcG9pbnQgYW5kIG5hcnJvd2VyLlxyXG5AbWl4aW4gbWVkaWEtYnJlYWtwb2ludC1kb3duKCRuYW1lLCAkYnJlYWtwb2ludHM6ICRncmlkLWJyZWFrcG9pbnRzKSB7XHJcbiAgJG1heDogYnJlYWtwb2ludC1tYXgoJG5hbWUsICRicmVha3BvaW50cyk7XHJcbiAgQGlmICRtYXgge1xyXG4gICAgQG1lZGlhIChtYXgtd2lkdGg6ICRtYXgpIHtcclxuICAgICAgQGNvbnRlbnQ7XHJcbiAgICB9XHJcbiAgfSBAZWxzZSB7XHJcbiAgICBAY29udGVudDtcclxuICB9XHJcbn1cclxuXHJcbi8vIE1lZGlhIHRoYXQgc3BhbnMgbXVsdGlwbGUgYnJlYWtwb2ludCB3aWR0aHMuXHJcbi8vIE1ha2VzIHRoZSBAY29udGVudCBhcHBseSBiZXR3ZWVuIHRoZSBtaW4gYW5kIG1heCBicmVha3BvaW50c1xyXG5AbWl4aW4gbWVkaWEtYnJlYWtwb2ludC1iZXR3ZWVuKCRsb3dlciwgJHVwcGVyLCAkYnJlYWtwb2ludHM6ICRncmlkLWJyZWFrcG9pbnRzKSB7XHJcbiAgJG1pbjogYnJlYWtwb2ludC1taW4oJGxvd2VyLCAkYnJlYWtwb2ludHMpO1xyXG4gICRtYXg6IGJyZWFrcG9pbnQtbWF4KCR1cHBlciwgJGJyZWFrcG9pbnRzKTtcclxuXHJcbiAgQGlmICRtaW4gIT0gbnVsbCBhbmQgJG1heCAhPSBudWxsIHtcclxuICAgIEBtZWRpYSAobWluLXdpZHRoOiAkbWluKSBhbmQgKG1heC13aWR0aDogJG1heCkge1xyXG4gICAgICBAY29udGVudDtcclxuICAgIH1cclxuICB9IEBlbHNlIGlmICRtYXggPT0gbnVsbCB7XHJcbiAgICBAaW5jbHVkZSBtZWRpYS1icmVha3BvaW50LXVwKCRsb3dlciwgJGJyZWFrcG9pbnRzKSB7XHJcbiAgICAgIEBjb250ZW50O1xyXG4gICAgfVxyXG4gIH0gQGVsc2UgaWYgJG1pbiA9PSBudWxsIHtcclxuICAgIEBpbmNsdWRlIG1lZGlhLWJyZWFrcG9pbnQtZG93bigkdXBwZXIsICRicmVha3BvaW50cykge1xyXG4gICAgICBAY29udGVudDtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8vIE1lZGlhIGJldHdlZW4gdGhlIGJyZWFrcG9pbnQncyBtaW5pbXVtIGFuZCBtYXhpbXVtIHdpZHRocy5cclxuLy8gTm8gbWluaW11bSBmb3IgdGhlIHNtYWxsZXN0IGJyZWFrcG9pbnQsIGFuZCBubyBtYXhpbXVtIGZvciB0aGUgbGFyZ2VzdCBvbmUuXHJcbi8vIE1ha2VzIHRoZSBAY29udGVudCBhcHBseSBvbmx5IHRvIHRoZSBnaXZlbiBicmVha3BvaW50LCBub3Qgdmlld3BvcnRzIGFueSB3aWRlciBvciBuYXJyb3dlci5cclxuQG1peGluIG1lZGlhLWJyZWFrcG9pbnQtb25seSgkbmFtZSwgJGJyZWFrcG9pbnRzOiAkZ3JpZC1icmVha3BvaW50cykge1xyXG4gICRtaW46IGJyZWFrcG9pbnQtbWluKCRuYW1lLCAkYnJlYWtwb2ludHMpO1xyXG4gICRtYXg6IGJyZWFrcG9pbnQtbWF4KCRuYW1lLCAkYnJlYWtwb2ludHMpO1xyXG5cclxuICBAaWYgJG1pbiAhPSBudWxsIGFuZCAkbWF4ICE9IG51bGwge1xyXG4gICAgQG1lZGlhIChtaW4td2lkdGg6ICRtaW4pIGFuZCAobWF4LXdpZHRoOiAkbWF4KSB7XHJcbiAgICAgIEBjb250ZW50O1xyXG4gICAgfVxyXG4gIH0gQGVsc2UgaWYgJG1heCA9PSBudWxsIHtcclxuICAgIEBpbmNsdWRlIG1lZGlhLWJyZWFrcG9pbnQtdXAoJG5hbWUsICRicmVha3BvaW50cykge1xyXG4gICAgICBAY29udGVudDtcclxuICAgIH1cclxuICB9IEBlbHNlIGlmICRtaW4gPT0gbnVsbCB7XHJcbiAgICBAaW5jbHVkZSBtZWRpYS1icmVha3BvaW50LWRvd24oJG5hbWUsICRicmVha3BvaW50cykge1xyXG4gICAgICBAY29udGVudDtcclxuICAgIH1cclxuICB9XHJcbn1cclxuIl19 */");

/***/ }),

/***/ "./src/app/routes/home/home/home.component.ts":
/*!****************************************************!*\
  !*** ./src/app/routes/home/home/home.component.ts ***!
  \****************************************************/
/*! exports provided: HomeComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "HomeComponent", function() { return HomeComponent; });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/__ivy_ngcc__/fesm2015/core.js");
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/__ivy_ngcc__/fesm2015/router.js");



let HomeComponent = class HomeComponent {
    constructor(_router) {
        this._router = _router;
    }
    ngOnInit() {
    }
    navigateToSimpleLogEntry() {
        this._router.navigate(['/log-entry/simple-log']);
    }
};
HomeComponent.ctorParameters = () => [
    { type: _angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"] }
];
HomeComponent = Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__decorate"])([
    Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
        selector: 'app-home',
        template: Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"])(__webpack_require__(/*! raw-loader!./home.component.html */ "./node_modules/raw-loader/dist/cjs.js!./src/app/routes/home/home/home.component.html")).default,
        styles: [Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__importDefault"])(__webpack_require__(/*! ./home.component.scss */ "./src/app/routes/home/home/home.component.scss")).default]
    })
], HomeComponent);



/***/ })

}]);
//# sourceMappingURL=home-home-module-es2015.js.map