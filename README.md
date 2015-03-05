# Visualization Toolkit for CDI

[![Build Status][Travis badge]][Travis build]

[Travis badge]: https://travis-ci.org/astefanutti/cdeye.svg
[Travis build]: https://travis-ci.org/astefanutti/cdeye

## About

_CDEye_ is a visualization toolkit for [CDI][]. It consists of:
+ A CDI [portable extension][] that provides access to the CDI deployment metadata,
+ A series of RESTful Web Services packaged as a WAR portable to any [JAX-RS][] compliant runtime that expose these metadata,
+ An HTML5 front-end that uses [cola.js][] and [D3.js][] to layout and display the dependency injection graph along with the [bean archives][] structure.

[CDI]: http://www.cdi-spec.org/
[JAX-RS]: https://jax-rs-spec.java.net/
[cola.js]: http://marvl.infotech.monash.edu/webcola/
[D3.js]: http://d3js.org/

[portable extension]: http://docs.jboss.org/cdi/spec/1.2/cdi-spec.html#spi
[bean archives]: http://docs.jboss.org/cdi/spec/1.2/cdi-spec.html#bean_archive

## Examples

The following interactive visualization is automatically generated for the [Metrics CDI](https://github.com/astefanutti/metrics-cdi) library, you can click on it to see it in action:
[![Click to see it in action!](https://raw.github.com/astefanutti/cdeye/gh-pages/metrics.png)](http://astefanutti.github.io/cdeye/test.html?example=metrics.json)

Another visualization automatically generated for a more complex deployment, just wait until the layout has converged:
[![Click to see it in action!](https://raw.github.com/astefanutti/cdeye/gh-pages/cnct.png)](http://astefanutti.github.io/cdeye/test.html?example=cnct.json)

## License

Copyright © 2014-2015, Antonin Stefanutti

Published under Apache Software License 2.0, see LICENSE
