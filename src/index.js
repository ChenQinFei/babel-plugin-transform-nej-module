
let t;
let options = {};
let fileExt = {
    'text': '.html',
    'default': '.js'
}

module.exports = function(babel) {
    t = babel.types;
    return {
        visitor: {
            ExpressionStatement(path, state) {
                const callee = path.node.expression.callee;
                options = state.opts || options;

                if(!callee) return;

                switch(callee.name) {
                case 'define':
                    moduleTransform(path);
                    break;
                default:
                    break;
                }
            }
        }
    };
};

const moduleTransform = function(path) {
    const targetPath = path.node.expression;
    const urls = targetPath.arguments[0].elements.map( itm => {            
            return t.stringLiteral(spotAlias(itm.value));
        }),
        names = targetPath.arguments[1].params.map( itm => {
            return t.identifier(itm.name);
        }),
        content = contentTransform(targetPath.arguments[1].body.body),
        results = names.map( (name, idx) => {
            const url = urls[idx];
            return urlTransform(url, name);
        }).concat(content);

    path.replaceWithMultiple(results);
};

const urlTransform = function(url, name) {
    return t.variableDeclaration('const',
        [t.variableDeclarator(name,
            t.callExpression(
                t.identifier('require'),
                [url]
            ))
        ]);
};

const contentTransform = function(content) {
    return content.map( itm => {
        if(t.isReturnStatement(itm)) {
            return t.assignmentExpression('=',
                t.memberExpression(t.identifier('module'), t.identifier('exports')),
                itm.argument);
        }
        else {
            return itm;
        }
    });
};

const spotAlias = function(url) {
    let [_fileExtKey, _url] = url.split('!');
    
    if(!_url) {
        _url = _fileExtKey;
        _fileExtKey = 'default';
    }
    _url = _url.split('/');

    for(let key in options) {
        _url = _url.map( itm => {
            if(itm === key){                
                return options[key];
            }
            else {
                return itm;
            }
        });
    };

    _url.unshift('.');

    return  _url.join('/') + fileExt[_fileExtKey];
}