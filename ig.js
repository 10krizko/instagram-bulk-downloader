const fetch = require('node-fetch');
const fs = require('fs');
const https = require('https');

let imgData = [];
let processedUrls = 0;
let imgs = 0;
const dir = __dirname + '/downloaded/';
const cliArgs = process.argv.slice(2);
const sourceFileName = cliArgs[0];

fs.readFile(sourceFileName, function (err, data) {
    if (err) throw err;
    let rows = data.toString().split('\n');
    parseUrls(rows);
});

function parseUrls(source) {
    source.forEach((url) => {
        (async () => {
            try {
                const response = await fetch(url + '?__a=1');
                const json = await response.json();
                
                if (json.graphql) {
                    imgs++;
                    if (!json.graphql.shortcode_media.edge_sidecar_to_children) {
                        imgData.push({
                            shortcode: json.graphql.shortcode_media.shortcode,
                            type: 'image',
                            url: json.graphql.shortcode_media.display_url,
                        });
                    } else {
                        let urls = [];
                        const nodeChildren = json.graphql.shortcode_media.edge_sidecar_to_children.edges;
    
                        nodeChildren.forEach((child) => {
                            urls.push(child.node.display_url);
                        });
    
                        imgData.push({
                            shortcode: json.graphql.shortcode_media.shortcode,
                            type: 'album',
                            urls: urls,
                        });
                    }
                }
            } catch(err) {
                console.log('❌ Not a valid link to a public Instagram post:', url, 'error:', err.message)
            }
            processedUrls++;
            if (processedUrls === source.length) {
                downloadImgs(imgData);
            }

        })();
    });
}

function downloadImgs(data) {
    let imgInAlbum = 0;
    data.forEach((item) => {
        if (item.type === 'image') {
            downloadImg(item.url, dir, item.shortcode);
        } else if (item.type === 'album') {
            fs.mkdir(__dirname + '/downloaded/' + item.shortcode, (err) => console.log(err));
            item.urls.forEach((url) => {
                imgInAlbum++;
                downloadImg(url, dir + item.shortcode + '/', item.shortcode + '-' + imgInAlbum);
            });
        }
    });
}

function downloadImg(url, path, filename) {
    const fullLocalPath = path + filename + '.jpg';

    https.get(url, (res) => {
        res.pipe(fs.createWriteStream(fullLocalPath)).once('close', () => console.log('✅ File', filename, 'downloaded successfully.'));
    });
}
