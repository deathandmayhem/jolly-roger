FROM ubuntu:14.04

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && \
  apt-key adv --keyserver keyserver.ubuntu.com --recv-key D1CD49BDD30B677273A75C66E4EE62700D8A9E8F && \
  echo "deb http://debathena.mit.edu/apt trusty debathena debathena-config debathena-system" > /etc/apt/sources.list.d/debathena.list && \
  apt-get update && \
  apt-get install -y python-pip python-dev debathena-moira-clients kstart apt-transport-https curl && \
  pip install credstash && \
  apt-get remove -y python-dev && \
  apt-get autoremove -y && \
  apt-get clean

RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-key 9FD3B784BC1C6FC31A8A0A1C1655A0AB68576280 && \
  echo "deb https://deb.nodesource.com/node_0.10 trusty main" > /etc/apt/sources.list.d/node.list && \
  apt-get update && \
  apt-get install -y nodejs && \
  apt-get autoremove -y && \
  apt-get clean

COPY . /app
WORKDIR /app

RUN curl -sL https://install.meteor.com?release=1.3.5.1 | /bin/sh && \
  npm i --production && \
  meteor build --directory /built_app --server=http://localhost:3000 && \
  (cd /built_app/bundle/programs/server && npm i) && \
  rm -rf ~/.meteor

ENV PORT 80
EXPOSE 80

WORKDIR /built_app/bundle
CMD /app/scripts/run_jolly_roger.sh
