#es6-modular

> Proof of concept for es6 modules from source mixed with bower packages

## Usage

```javascript
npm install
gulp
```

This will make available the following applications:

[http://localhost:8000/build/app1.html](http://localhost:8000/build/app1.html)

[http://localhost:8000/build/app2.html](http://localhost:8000/build/app2.html)

## Aim

Solve the **module problem** - How to selectively include code that has be authored in a separate project path.

Ideally add some syntactic sugar for **classes** without substantially deviating from javascript syntax.

## Requirements

A single javascript file exists for each html file, both are local in the `src` directory.

The application javascript includes library code by [Ecmascript6(ES6)](http://wiki.ecmascript.org/doku.php?id=harmony:modules)
import. It likely provides IOC mappings, such as `angular.module().service()`.

Additional library code is available in `bower` packages and locally in the `src` directory.

The ES6 `import` syntax must be the same for any source, such that:

1. Local library code may be arbitarily moved to packages, or
2. Package code may be overriden by local code

[Source maps](http://blog.teamtreehouse.com/introduction-source-maps) must be generated for all transpiled code
and map to the correct source.

## How it works

The google originated [Tracur](https://github.com/google/traceur-compiler) compiler provides support for a subset
of ES6 features. These are sufficient to address the stated aims.

However, to achieve uniform `import` syntax, all files must be in the same (temporary) directory. API support for
Traceur does not currently support single file output in manner that can be integrated with Gulp. Certainly
there is no support for a virtual (stream) implementation of such temporary files. So we use a conventional directory
that is deleted before and after `js:build` steps.

A side effect of the `temp` directory is that the source-maps will incorrectly reference files in the `temp` directory
and must be rewritten. To do so, we track the movement of files, so that we can make correction to the source-maps.

Finally, the single application script is injected into the html file of the same name, along with bower dependencies.
