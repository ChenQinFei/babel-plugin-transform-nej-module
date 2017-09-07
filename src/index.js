let t;

module.exports = function (babel) {
    t = babel.types;
    return {
        visitor: {
            CallExpression(path, state) {
                const callee = path.node.callee,
                    args = path.node.arguments;
                let _callee, _arguments;

                if (!callee) return;

                if ((callee.name === 'define') || ((t.isMemberExpression(callee) ? // nej.define
                        ((callee.object.name ? callee.object.name.toLocaleLowerCase() == 'nej' : false) &&
                            callee.property.name === 'define') :
                        false
                    ))) {
                    _callee = normalizeDefine();

                    path.node.callee = _callee;

                    if (t.isArrayExpression(path.node.arguments[0])) {
                        path.node.arguments[0] = normalizeUrl(args[0]);
                        path.get('arguments.1.body').unshiftContainer('body', injectParams());
                    }

                    if (t.isFunctionExpression(path.node.arguments[0])) {
                        path.get('arguments.0.body').unshiftContainer('body', injectParams());
                    }

                }
            }
        }
    };
};

const normalizeDefine = function () {
    return t.identifier('define');
}

const normalizeUrl = function (arg) {
    const urls = arg.elements;

    const _urls = urls.map(itm => spotBrace(spotPlatform(spotExt(itm.value))));
    return t.arrayExpression(_urls);
}

const spotExt = function (url) {
    let [_fileExtKey, _url] = url.split('!');

    if (!_url) {
        _url = _fileExtKey;
    }

    return _url;
}

const spotPlatform = function (url) {
    let _url = url.split(''),
        [leftPos, rightPos] = [_url.indexOf('{'), _url.indexOf('}')];

    if (leftPos >= 0 && rightPos >= 0) {
        const key = _url.slice(leftPos+1, rightPos).join('');
      
        if (key === 'platform') {
            _url.unshift('./');
        }
    }

    return _url.join('');
}

const spotBrace = function (url) {
    let _url = url.split(''),
        [leftPos, rightPos] = [_url.indexOf('{'), _url.indexOf('}')];

    if (rightPos >= 0) {
        if (_url[rightPos+1] !== '/') {
            _url.splice(rightPos, 1, '/');
        } else {
            _url.splice(rightPos, 1);
        }
    }
    if (leftPos >= 0) {
        _url.splice(leftPos, 1);

    }
    return t.stringLiteral(_url.join(''));
}

const injectParams = function () {
    let p = generateParam(t.identifier('p'), t.identifier('window')),
        o = generateParam(t.identifier('o'), t.objectExpression([])),
        f = generateParam(t.identifier('f'), t.functionExpression(null, [], t.blockStatement([t.returnStatement(t.numericLiteral(-1))]))),
        r = generateParam(t.identifier('r'), t.arrayExpression([]));
    return [p, o, f, r];
}

const generateParam = function (name, value) {
    return t.variableDeclaration('let', [
        t.variableDeclarator(name, value)
    ])
}