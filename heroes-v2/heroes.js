const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;

const port = process.argv.slice(2)[0];
const app = express();
app.use(bodyParser.json());

const dbUrl = 'mongodb://localhost:27017/node_microservices';

const dbClient = new MongoClient(dbUrl, { useNewUrlParser: true});

dbClient.connect( err => {
  if (err) throw err;
});

function retrieveFromDb(collectionName) {
return new Promise(resolve => {
      dbClient.db('node_microservices').collection(collectionName).find({}).project({_id: 0}).toArray((err, objects) => {
          resolve(objects);
      });
  });
}

app.get('/heroes', (req, res) => {
console.log('Returning heroes list.');
retrieveFromDb('heroes').then(heroes => res.send(heroes));
});

app.get('/powers', (req, res) => {
console.log('Returning powers list.');
retrieveFromDb('powers').then(heroes => res.send(heroes));
});

app.post('/hero/**', (req, res) => {
const heroId = parseInt(req.params[0]);
console.log('Updating hero: ' + heroId);
    const heroCollection = dbClient.db('node_microservices').collection('heroes');
   
    if(!heroCollection) {
       console.log(`Hero collection not found.`);
       res.status(400).send('Connection to database cannot be established.');
       return;
    }

    heroCollection.find({}).project({_id: 0}).toArray((err, heroes) => {
        const foundHero = heroes.find(subject => subject.id === heroId);

        if (foundHero) {
            for (let attribute in foundHero) {
                if (req.body[attribute]) {
                    foundHero[attribute] = req.body[attribute];

                    heroCollection.updateOne({id: heroId }, {$set: req.body});
                    console.log(`Set ${attribute} to ${req.body[attribute]} in hero: ${heroId}`);
                }
            }
            res.status(202).header({Location: `http://localhost:8080/hero-service/hero/${foundHero.id}`}).send(foundHero);
        } else {
            console.log(`Hero not found.`);
            res.status(404).send('Hero not found.');
        }
    });
});

app.use('/img', express.static(path.join(__dirname,'img')));

require('../eureka-helper/eureka-helper').registerWithEureka('heroes-service', port);

console.log(`Heroes service listening on port ${port}.`);
app.listen(port);