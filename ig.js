const fetch = require('node-fetch');
const fs = require('fs');
const https = require('https');

let url = 'https://www.instagram.com/p/CDqjORUpU2r/';
let urls = [
    'https://www.instagram.com/p/CCT9zYyB0_f/',
    'https://www.instagram.com/p/CClfzQhJIaw/',
    'https://www.instagram.com/p/CC0lc_5nbzo/',
    'https://www.instagram.com/p/CC8GBV6H3km/',
    'https://www.instagram.com/p/CC9Gc_-BCLo/',
    'https://www.instagram.com/p/CC_b2c_Dz8K/',
    'https://www.instagram.com/p/CDHT4GxBBMG/'
];

let imgData = [];
let processedUrls = 0;
let imgs = 0;

urls.forEach( url => {
    (async () => {
        const response = await fetch(url + '?__a=1');
        const json = await response.json();    
        // console.log('fetched json of ', url); 
        
        if (!json.graphql) {
            console.log('could not access image... private profile maybe?')
        } else {
            imgs++
            if (!json.graphql.shortcode_media.edge_sidecar_to_children) {
                // console.log('image url', json.graphql.shortcode_media.display_url); 
                imgData.push({
                    shortcode: json.graphql.shortcode_media.shortcode,
                    type: 'image',
                    url: json.graphql.shortcode_media.display_url
                });
            } else {
                let urls = [];
                const nodeChildren = json.graphql.shortcode_media.edge_sidecar_to_children.edges;

                nodeChildren.forEach((child) => {                    
                    urls.push(child.node.display_url);
                });
                // console.log('album urls', urls); 

                imgData.push({
                    shortcode: json.graphql.shortcode_media.shortcode,
                    type: 'album',
                    urls: urls
                });

                
            }
        }
        processedUrls++;
        if (processedUrls === urls.length) {
            writeUrlsToFile(imgData);
            downloadImgs(imgData);
            console.log('writeUrlsToFile and downloadImgs called');
        }
    })();
    
    
})

function writeUrlsToFile(data) {
    fs.writeFile('img.txt', data, function (err) {
        if (err) return console.log(err);
        console.log(imgs, 'image urls written to file');
    });
}

const dir = __dirname + '/downloaded/';

function downloadImgs(data) {
    let imgInAlbum = 0;
    data.forEach(item => {
        if (item.type === 'image') {
            downloadImg(item.url, dir, item.shortcode );
        } else if (item.type === 'album') {
            fs.mkdir(__dirname + '/downloaded/' + item.shortcode, err => console.log(err));
            item.urls.forEach( url => {
                imgInAlbum++;
                downloadImg(url, dir + item.shortcode + '/', item.shortcode + '-' + imgInAlbum );
            })
        }
    });
}

function downloadImg(url, path, filename) {
    const fullLocalPath = path + filename + '.jpg';

    https.get(url, (res) => {
        res.pipe(fs.createWriteStream(fullLocalPath)).once('close', () => console.log('img download successful'));
    });
        console.log('url', url);
};