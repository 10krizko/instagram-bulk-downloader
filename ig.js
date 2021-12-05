const fetch = require('node-fetch');
const fs = require('fs');
const https = require('https');

const maxUrls = 500
let parsedPostsCount = 0;
let downloadedPostsCount = 0;

const dir = __dirname + '/downloaded/';
const sourceFileName = process.argv.slice(2)[0];

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// Open input file, parse URLs and download posts
fs.readFile(sourceFileName, function (err, data) {
    if (err) throw err;
    let inputUrls = data.toString().split('\n');

    parseUrls(inputUrls).then(
        (posts) => {
            if (parsedPostsCount > 0) {
                console.log('🗄 Parsing finished.', parsedPostsCount, 'valid public Instagram post URLs found.');
                downloadPosts(posts);

                return
            } else {
                console.log('🛑 Parsing failed. If your input file is OK, Instagram is probably redirecting you to login (they really don\'t like scraping). Try it again tomorrow.')

                return
            }
        }
    );
});

async function parseUrls(source) {
    // Get rid of empty lines
    const trimmedSource = source.filter(line => line.trim().length > 0)

    if (trimmedSource.length < 1) return []
    if (trimmedSource.length > maxUrls) {
        console.log('🛑 Let\'s not get crazy here, that\'s way too many posts to download at once.')
        return []
    }

    console.log('👋 Found', trimmedSource.length, 'lines to parse. Parsing...');
    console.log('⏳ Program waits 3 to 5 seconds between parsing requests to avoid Instagram\'s rate limit.');

    // Calculate random sleep times between requests and make it 0 before the first one
    let sleepTimes = trimmedSource.map(() => getParsingSleepTime())
    sleepTimes[0] = 0

    const imgData = trimmedSource
        .map((url, i) => {
            return (async () => {
                // Simulate sequential requests in async functions through sleep times
                let sleepTime = sleepTimes.slice(1, i + 1).reduce((a, b) => a + b, 0)
                await timeout(sleepTime);

                try {
                    const response = await fetch(url + '?__a=1');
                    const json = await response.json();

                    if (json.graphql) {
                        parsedPostsCount++;

                        if (!json.graphql.shortcode_media.edge_sidecar_to_children) {
                            console.log('👌 Parsed image', json.graphql.shortcode_media.shortcode)

                            return {
                                shortcode: json.graphql.shortcode_media.shortcode,
                                type: 'image',
                                url: json.graphql.shortcode_media.display_url,
                            };
                        } else {
                            let urls = [];
                            const nodeChildren = json.graphql.shortcode_media.edge_sidecar_to_children.edges;

                            nodeChildren.forEach((child) => {
                                urls.push(child.node.display_url);
                            });

                            console.log('👌 Parsed album', json.graphql.shortcode_media.shortcode)

                            return {
                                shortcode: json.graphql.shortcode_media.shortcode,
                                type: 'album',
                                urls: urls,
                            };
                        }
                    }
                } catch (err) {
                    console.log('❌ Cannot parse', url, 'because:', err.message)
                }
            })();
        });

    return await Promise.all(imgData)
}


function getParsingSleepTime() {
    return Math.floor(((Math.random() * 2) + 3) * 1000);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadPosts(posts) {
    const sleepTime = 300;
    const downloadedState = {}
    let currentSleepTime = 0;

    posts.forEach((post) => {
        if (post) {
            if (post.type === 'image') {

                downloadedState[post.shortcode + ''] = false
                setTimeout(() => { downloadImg(post.url, dir, post.shortcode, downloadedState) }, currentSleepTime);
                currentSleepTime += sleepTime;
            } else if (post.type === 'album') {
                if (!fs.existsSync(dir + post.shortcode)) {
                    fs.mkdir(dir + post.shortcode, (err) => {
                        if (err) { console.log("⚠️ Cannot create directory", post.shortcode, err) }
                    });
                }

                post.urls.forEach((url, j) => {
                    downloadedState[post.shortcode + '-' + j] = false
                    setTimeout(() => { downloadImg(url, dir + post.shortcode + '/', post.shortcode + '-' + j, downloadedState) }, currentSleepTime);
                    currentSleepTime += sleepTime;
                });
            }
        }
    });


}

function downloadImg(url, path, filename, downloadedState) {
    const fullLocalPath = path + filename + '.jpg';

    https.get(url, (res) => {
        if (res.statusCode != 200) {
            console.log('❌ Cannot download', url, 'because:', res.statusCode);
            res.resume();
            return
        }

        res.pipe(fs.createWriteStream(fullLocalPath))
            .on('error', (error) => {
                console.log('ERROR:', filename, error)
            })
            .once('close', () => {
                console.log('👍 File', filename, 'downloaded successfully.')
                downloadedPostsCount++;
                updateDownloadState(filename + '', downloadedState)
            })
    });
}

function updateDownloadState(key, state) {
    state[key] = true;

    if (Object.values(state).every((value) => value === true)) {
        console.log('✅ Downloading finished.', downloadedPostsCount, 'posts downloaded. You\'ll find them in', dir)
    }
}