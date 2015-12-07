/* ---- DON'T EDIT BELOW ---- */

var Plume = Plume || {};

Plume = (function (window, document) {
    'use strict';

    // Init some defaults;
    var config = {
        title: "/dev/solid",
        tagline: "Rocking the Solid Web",
        picture: "img/logo-white.svg",
        dataPath: 'posts'
    }

    // RDF
    var PROXY = "https://databox.me/proxy?uri={uri}";
    var TIMEOUT = 5000;

    $rdf.Fetcher.crossSiteProxyTemplate = PROXY;
    // common vocabs
    var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
    var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
    var OWL = $rdf.Namespace("http://www.w3.org/2002/07/owl#");
    var PIM = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
    var UI = $rdf.Namespace("http://www.w3.org/ns/ui#");
    var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
    var LDP = $rdf.Namespace("http://www.w3.org/ns/ldp#");
    var MBLOG = $rdf.Namespace("http://www.w3.org/ns/mblog#");
    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
    var TAGS = $rdf.Namespace("http://www.holygoat.co.uk/owl/redwood/0.1/tags/");

    // init markdown editor
    var editor = new SimpleMDE({
        status: false,
        spellChecker: false,
        initialValue: 'This is a markdown editor, type something...'
    });
    // hljs.initHighlightingOnLoad();
    var parseMD = function(data) {
        if (data) {
            return editor.markdown(data);
        }
        return '';
    };
    // Get params from the URL
    var queryVals = (function(a) {
        if (a == "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=', 2);
            if (p.length == 1)
                b[p[0]] = "";
            else
                b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'));

    // sanitize value from form
    var getBodyValue = function() {
        var val = editor.codemirror.getValue();
        return val.replace('"', '\"');
    };
    var setBodyValue = function(val) {
        editor.value(val);
    }

    var user = {
        name: "John Doe",
        webid: "https://example.org/user#me",
        picture: "img/icon-blue.svg"
    };

    var posts = {};
    var authors = {};

    var appURL = window.location.origin+window.location.pathname;

    // Initializer
    var init = function() {
        // Set default config values
        document.querySelector('.blog-picture').src = config.picture;
        document.querySelector('.blog-title').innerHTML = config.title;
        document.querySelector('.blog-tagline').innerHTML = config.tagline;

        // append trailing slash to data path if missing
        if (config.dataPath.lastIndexOf('/') < 0) {
            config.dataPath += '/';
        }

        // Get the current user
        Solid.getUserFromURL(appURL).then(function(webid){
            if (webid.length === 0) {
                console.log("Could not find WebID from User header, or user is not authenticated. Got: "+webid);
            } else if (webid.slice(0, 4) == 'http') {
                // fetch and set user profile
                Solid.getWebIDProfile(webid).then(function(g) {
                    setUser(webid, g);
                });
            }
        });

        // Init data container
        if (!config.dataContainer) {
            Solid.resourceStatus(appURL+config.dataPath).then(
                function(container) {
                    // create data container for posts if it doesn't exist
                    if (!container.exists && container.err === null) {
                        Solid.newResource(appURL, config.dataPath, null, true).then(
                            function(res) {
                                if (res.url && res.url.length > 0) {
                                    config.dataContainer = res.url;
                                }
                            }
                        )
                        .catch(
                            function(err) {
                                console.log("Could not create data container for posts: HTTP "+err.status);
                                notify('error', 'Could not create data container');
                            }
                        );
                    } else if (container.exists) {
                        config.dataContainer = appURL+config.dataPath;
                    }
                }
            );
        }

        // select element holding all the posts
        var postsdiv = document.querySelector('.posts');

        // add all posts to viewer
        if (posts && posts.length > 0) {
            for (var i in posts) {
                var article = addPostToDom(posts[i]);
                postsdiv.appendChild(article);
            }
        } else {
            // no posts, display a mock one
            var acme = {
                url: "https://example.org/",
                title: "Welcome to Plume, a Solid blogging platform",
                author: "https://example.org/user#me",
                date: "3 Dec 2015",
                body: "```\nHellowWorld();\n```\n\n**Note!** This is a demo post. Feel free to remove it whenever you wish.\n\n*Plume* is a 100% client-side application built using [Solid standards](https://github.com/solid/), in which data is decoupled from the application itself. This means that you can host the application on any Web server, without having to install anything -- no database, no messing around with Node.js, it has 0 dependencies! It also means that other similar applications will be able to reuse the data resulting from your posts, without having to go through a complicated API.\n\nPlume uses [Markdown](https://en.wikipedia.org/wiki/Markdown) to provide you with the easiest and fastest experience for writing beautiful articles. Click the *Edit* button below to see this article. You won't be able to save it however.\n\nGive it a try, write your first post!",
                tags: [
                    { color: "#df2d4f", name: "Decentralization" },
                    { color: "#4d85d1", name: "Solid" }
                ]
            };
            posts[acme.url] = acme;
            postsdiv.appendChild(addPostToDom(acme));
        }

        var header = document.querySelector('.header');
        var header_height = getComputedStyle(header).height.split('px')[0];
        var nav = document.querySelector('.nav');
        var pic = document.querySelector('.blog-picture');
        var pic_height = getComputedStyle(pic).height.split('px')[0];
        var diff = header_height - pic_height;

        function stickyScroll(e) {
            if (window.pageYOffset > (diff + 50)) {
                nav.classList.add('fixed-nav');
            }

            if(window.pageYOffset < (diff + 50)) {
                nav.classList.remove('fixed-nav');
            }
        }

        if (queryVals['view'] && queryVals['view'].length > 0) {
            var url = decodeURIComponent(queryVals['view']);
            showViewer(url);
        } else if (queryVals['edit'] && queryVals['edit'].length > 0) {
            var url = decodeURIComponent(queryVals['edit']);
            showEditor(url);
        } else if (queryVals['new'] !== undefined) {
            showEditor();
        }

        // Scroll handler to toggle classes.
        window.addEventListener('scroll', stickyScroll, false);
    };

    // set the current user
    var setUser = function(webid, g) {
        // name: "John Doe",
        // webid: "https://example.org/user#me",
        // picture: "img/icon-blue.svg"

        // set WebID
        user.webid = webid;

        var webidRes = $rdf.sym(webid);

        // set name
        var name = g.any(webidRes, FOAF('name'));
        if (!name || name.value.length == 0) {
            name = '';
        }
        user.name = name.value;

        // set picture
        var pic, img = g.any(webidRes, FOAF('img'));
        if (img) {
            pic = img;
        } else {
            // check if profile uses depic instead
            var depic = g.any(webidRes, FOAF('depiction'));
            if (depic) {
                pic = depic;
            }
        }
        if (pic && pic.value.length > 0) {
            user.picture = pic.value;
        }

        // add user to authors list
        authors[webid] = user;
    };

    var confirmDelete = function(url) {
        var postTitle = (posts[url].title)?'<br><p><strong>'+posts[url].title+'</strong></p>':'this post';
        var div = document.createElement('div');
        div.id = 'delete';
        div.classList.add('dialog');
        var section = document.createElement('section');
        section.innerHTML = "You are about to delete "+postTitle;
        div.appendChild(section);

        var footer = document.createElement('footer');

        var del = document.createElement('button');
        del.classList.add("button");
        del.classList.add('danger');
        del.classList.add('float-left');
        del.setAttribute('onclick', 'Plume.deletePost(\''+url+'\')');
        del.innerHTML = 'Delete';
        footer.appendChild(del);
        // delete button
        var cancel = document.createElement('button');
        cancel.classList.add('button');
        cancel.classList.add('float-right');
        cancel.setAttribute('onclick', 'Plume.cancelDelete()');
        cancel.innerHTML = 'Cancel';
        footer.appendChild(cancel);
        div.appendChild(footer);

        // append to body
        document.querySelector('body').appendChild(div);
    };

    var cancelDelete = function() {
        document.getElementById('delete').remove();
    };

    var deletePost = function(url) {
        if (url) {
            delete posts[url];
            document.getElementById(url).remove();
            document.getElementById('delete').remove();
            notify('success', 'Successfully deleted post');
            resetAll();
        }
    };

    var showViewer = function(url) {
        var viewer = document.querySelector('.viewer');
        var article = addPostToDom(posts[url]);
        if (!article) {
            resetAll();
            return;
        }
        // append article
        viewer.appendChild(article);
        var footer = document.createElement('footer');
        viewer.appendChild(footer);
        // add separator
        var sep = document.createElement('h1');
        sep.classList.add('content-subhead');
        footer.appendChild(sep);
        // create button list
        var buttonList = document.createElement('div');
        var back = document.createElement('button');
        back.classList.add("button");
        back.setAttribute('onclick', 'Plume.resetAll()');
        back.innerHTML = '≪ Go back';
        buttonList.appendChild(back);
        // append button list to viewer
        footer.appendChild(buttonList);
        // hide main page
        document.querySelector('.posts').classList.add('hidden');
        document.querySelector('.viewer').classList.remove('hidden');

        window.history.pushState("", document.querySelector('title').value, window.location.pathname+"?view="+encodeURIComponent(url));
    }

    var showEditor = function(url) {
        var tags = document.querySelector('.editor-tags');
        var appendTag = function(name, color) {
            var tagDiv = document.createElement('div');
            tagDiv.classList.add('post-category');
            tagDiv.classList.add('inline-block');
            if (color) {
                tagDiv.setAttribute('style', 'background:'+color+';');
            }
            var span = document.createElement('span');
            span.innerHTML = name;
            tagDiv.appendChild(span);
            var tagLink = document.createElement('a');
            tagLink.setAttribute('onclick', 'this.parentElement.remove()');
            tagLink.innerHTML = 'x';
            tagDiv.appendChild(tagLink);
            tags.appendChild(tagDiv);
            // clear input
            document.querySelector('.editor-add-tag').value = '';
        };

        document.querySelector('.nav').classList.add('hidden');
        document.querySelector('.posts').classList.add('hidden');
        document.querySelector('.viewer').classList.add('hidden');
        document.querySelector('.start').classList.add('hidden');
        document.querySelector('.editor').classList.remove('hidden');
        document.querySelector('.editor-title').focus();
        document.querySelector('.editor-author').innerHTML = user.name;
        document.querySelector('.editor-date').innerHTML = moment().format('LL');
        document.querySelector('.editor-tags').innerHTML = '';
        document.querySelector('.editor-add-tag').value = '';
        setBodyValue('');

        // add event listener for tags
        document.querySelector('.editor-add-tag').onkeypress = function(e){
            if (!e) e = window.event;
            var keyCode = e.keyCode || e.which;
            if (keyCode == '13'){
                appendTag(document.querySelector('.editor-add-tag').value, document.querySelector('.color-picker').style.background);
            }
        }

        window.history.pushState("", document.querySelector('title').value, window.location.pathname+"?new");
        // preload data if requested
        if (url && url.length > 0) {
            var post = posts[url];
            if (post.title) {
                document.querySelector('.editor-title').innerHTML = post.title;
            }
            if (post.author) {
                var author = getAuthorByWebID(post.author);
                document.querySelector('.editor-author').innerHTML = author.name;
            }
            if (post.date) {
                document.querySelector('.editor-date').innerHTML = post.date;
            }

            // add tags
            if (post.tags && post.tags.length > 0) {
                var tagInput = document.createElement('input');
                for (var i in post.tags) {
                    var tag = post.tags[i];
                    if (tag.name && tag.name.length > 0) {
                        appendTag(tag.name, tag.color);
                    }
                }

            }
            if (post.body) {
                setBodyValue(post.body);
            }

            document.querySelector('.publish').innerHTML = "Update";
            document.querySelector('.publish').setAttribute('onclick', 'Plume.publishPost(\''+url+'\')');
            window.history.pushState("", document.querySelector('title').value, window.location.pathname+"?edit="+encodeURIComponent(url));
        } else {
            document.querySelector('.publish').innerHTML = "Publish";
            document.querySelector('.publish').setAttribute('onclick', 'Plume.publishPost()');
            window.history.pushState("", document.querySelector('title').value, window.location.pathname+"?new");
        }
    };

    var setColor = function(color) {
        document.querySelector('.color-picker').style.background = window.getComputedStyle(document.querySelector('.'+color), null).backgroundColor;
        document.querySelector('.pure-menu-active').classList.remove('pure-menu-active');
        document.querySelector('.editor-add-tag').focus();
    };

    var resetAll = function() {
        document.querySelector('.nav').classList.remove('hidden');
        document.querySelector('.editor').classList.add('hidden');
        document.querySelector('.viewer').classList.add('hidden');
        document.querySelector('.viewer').innerHTML = '';
        document.querySelector('.posts').classList.remove('hidden');
        document.querySelector('.editor-title').innerHTML = '';
        document.querySelector('.editor-author').innerHTML = '';
        document.querySelector('.editor-date').innerHTML = moment().format('LL');
        document.querySelector('.editor-tags').innerHTML = '';
        document.querySelector('.editor-add-tag').value = '';
        setBodyValue('');
        if (posts && Object.keys(posts).length === 0) {
            document.querySelector('.start').classList.remove('hidden');
        } else {
            document.querySelector('.start').classList.add('hidden');
        }

        window.history.pushState("", document.querySelector('title').value, window.location.pathname);
    };

    var publishPost = function(url) {
        var post = {};
        post.title = document.querySelector('.editor-title').innerHTML;
        post.author = user.webid;
        post.date = document.querySelector('.editor-date').innerHTML;
        post.body = getBodyValue();
        post.tags = [];
        var allTags = document.querySelectorAll('.editor-tags .post-category');
        for (var i in allTags) {
            if (allTags[i].style) {
                var tag = {};
                tag.name = allTags[i].querySelector('span').innerHTML;
                tag.color = rgbToHex(allTags[i].style.background);
                post.tags.push(tag);
            }
        }

        // this is called after the post data is done writing to the server
        var updateLocal = function(location) {
            post.url = location;
            posts[post.url] = post;
            // select element holding all the posts
            var postsdiv = document.querySelector('.posts');
            // add/update post element
            var article = addPostToDom(post);

            if (url) {
                var self = document.getElementById(url);
                self.parentNode.replaceChild(article, self);
            } else if (postsdiv.hasChildNodes()) {
                var first = postsdiv.childNodes[0];
                postsdiv.insertBefore(article, first);
            } else {
                postsdiv.appendChild(article);
            }

            // fade out to indicate new content
            article.scrollIntoView(true);
            article.classList.add("fade-out");
            notify('success', 'Your post was published');
            setTimeout(function() {
                article.style.background = "transparent";
            }, 500);
            resetAll();
        };

        // do not save the default post
        if (post.url == 'https://example.org/') {
            resetAll();
            return;
        } else {
            // Write data to server
            //TODO also write tags
            var g = new $rdf.graph();
            g.add($rdf.sym('#this'), RDF('type'), SIOC('Post'));
            g.add($rdf.sym('#this'), DCT('title'), $rdf.lit(post.title));
            g.add($rdf.sym('#this'), MBLOG('author'), $rdf.sym(post.author));
            g.add($rdf.sym('#this'), DCT('created'), $rdf.lit(moment(Date.now()).utcOffset('00:00').format("YYYY-MM-DDTHH:mm:ssZ"), '', $rdf.Symbol.prototype.XSDdateTime));
            g.add($rdf.sym('#this'), SIOC('content'), $rdf.lit(encodeHTML(post.body)));

            var triples = new $rdf.Serializer(g).toN3(g);

            if (url) {
                var writer = Solid.putResource(url, triples);
            } else {
                var slug = post.title.toLowerCase().replace(/ /g, '-');
                var writer = Solid.newResource(config.dataContainer, slug, triples);
            }
            writer.then(
                function(res) {
                    updateLocal(res.url);
                }
            )
            .catch(
                function(err) {
                    console.log(err);
                    resetAll();
                }
            );
        }
    };

    var getAuthorByWebID = function(webid) {
        var name = 'Unknown';
        var picture = 'img/icon-blue.svg';
        if (webid && webid.length > 0) {
            var author = authors[webid];
            if (author && author.name) {
                name = author.name;
            }
            if (author && author.picture) {
                picture = author.picture;
            }
        }
        return {name: name, picture: picture};
    };

    var addPostToDom = function(post) {
        // change separator: <h1 class="content-subhead">Recent Posts</h1>
        if (!post) {
            return;
        }
        var author = getAuthorByWebID(post.author);
        var name = author.name;
        var picture = author.picture;

        // create main post element
        var article = document.createElement('article');
        article.classList.add('post');
        article.id = post.url;

        // create header
        var header = document.createElement('header');
        header.classList.add('post-header');
        // append header to article
        article.appendChild(header);

        // set avatar
        var avatar = document.createElement('img');
        avatar.classList.add('post-avatar');
        avatar.src = picture;
        avatar.alt = avatar.title = name+"'s picture";
        // append picture to header
        header.appendChild(avatar);

        // create title
        var title = document.createElement('h2');
        title.classList.add('post-title');
        title.innerHTML = (post.title)?'<a href="#" onclick="Plume.showViewer(\''+post.url+'\')">'+post.title+'</a>':'';
        // append title to header
        header.appendChild(title);

        // add meta data
        var meta = document.createElement('p');
        meta.classList.add('post-meta');
        meta.innerHTML = "By ";
        // append meta to header
        header.appendChild(meta);

        // create meta author
        var metaAuthor = document.createElement('a');
        metaAuthor.classList.add('post-author');
        metaAuthor.href = post.author;
        metaAuthor.innerHTML = name;
        // append meta author to meta
        meta.appendChild(metaAuthor);

        // create meta date
        var metaDate = document.createElement('span');
        metaDate.classList.add('post-date');
        metaDate.innerHTML = " on "+post.date;
        // append meta date to meta
        meta.appendChild(metaDate);

        // create meta tags
        var metaTags = document.createElement('span');
        metaTags.classList.add('post-tags');
        metaTags.innerHTML = " under ";
        if (post.tags && post.tags.length > 0) {
            for (var i in post.tags) {
                var tag = post.tags[i];
                if (tag.name && tag.name.length > 0) {
                    var tagLink = document.createElement('a');
                    tagLink.classList.add('post-category');
                    if (tag.color) {
                        tagLink.setAttribute('style', 'background:'+tag.color+';');
                    }
                    tagLink.innerHTML = tag.name;
                    tagLink.href = "#";
                    tagLink.setAttribute('onclick', 'Plume.sortTag("'+tag.name+'")');
                    metaTags.appendChild(tagLink);
                }
            }
        } else {
            var tagLink = document.createElement('a');
            tagLink.classList.add('post-category');
            tagLink.innerHTML = "Uncategorized";
            tagLink.href = "#";
            tagLink.setAttribute('onclick', 'Plume.sortTag("Uncategorized")');
            metaTags.appendChild(tagLink);
        }
        // append meta tag
        meta.appendChild(metaTags);

        // create body
        var body = document.createElement('section');
        body.classList.add('post-body');
        body.innerHTML = parseMD(decodeHTML(post.body));
        // append body to article
        article.appendChild(body);

        // add footer with action links
        var footer = document.createElement('footer');
        if (user.webid == post.author) {
            // edit button
            var edit = document.createElement('a');
            edit.classList.add("action-button");
            edit.setAttribute('onclick', 'Plume.showEditor(\''+post.url+'\')');
            edit.setAttribute('title', 'Edit post');
            edit.innerHTML = '<img src="img/logo.svg" alt="Edit post">Edit';
            footer.appendChild(edit);
            // delete button
            var del = document.createElement('a');
            del.classList.add('action-button');
            del.classList.add('danger-text');
            del.setAttribute('onclick', 'Plume.confirmDelete(\''+post.url+'\')');
            del.innerHTML = 'Delete';
            footer.appendChild(del);
        }

        // append footer to post
        article.appendChild(footer);

        // append article to list of posts
        return article;
    };

    var sortTag = function(name) {
        console.log(name);
    };

    // Misc/helper functions
    var notify = function(ntype, text) {
        var timeout = 1000;
        var note = document.createElement('div');
        note.classList.add('note');
        note.innerHTML = text;
        switch (ntype) {
            case 'success':
                note.classList.add('success');
                break;
            case 'error':
                timeout = 3000;
                note.classList.add('danger');
                var tip = document.createElement('small');
                tip.classList.add('small');
                tip.innerHTML = ' Tip: check console for debug information.';
                note.appendChild(tip);
                break;
            default:
        }
        document.querySelector('body').appendChild(note);

        setTimeout(function() {
            note.remove();
        }, timeout);
    };

    // Convert rgb() to #hex
    var rgbToHex = function (color) {
        color = color.replace(/\s/g,"");
        var aRGB = color.match(/^rgb\((\d{1,3}[%]?),(\d{1,3}[%]?),(\d{1,3}[%]?)\)$/i);
        if(aRGB)
        {
            color = '';
            for (var i=1;  i<=3; i++) color += Math.round((aRGB[i][aRGB[i].length-1]=="%"?2.55:1)*parseInt(aRGB[i])).toString(16).replace(/^(.)$/,'0$1');
        }
        else color = color.replace(/^#?([\da-f])([\da-f])([\da-f])$/i, '$1$1$2$2$3$3');
        return '#'+color;
    };

    var togglePreview = function() {
        editor.togglePreview();
        var text = document.querySelector('.preview');
        text.innerHTML = (text.innerHTML=="Preview")?"Edit":"Preview";
    };

    // escape HTML code
    var encodeHTML = function (html) {
        return html
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    var decodeHTML = function (html) {
        return html
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, "\"")
            .replace(/&#039;/g, "'");
    };


    // start app
    init();



    // return public functions
    return {
        resetAll: resetAll,
        showEditor: showEditor,
        showViewer: showViewer,
        setColor: setColor,
        publishPost: publishPost,
        confirmDelete: confirmDelete,
        deletePost: deletePost,
        togglePreview: togglePreview
    };
}(this, this.document));
