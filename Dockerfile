FROM meteorhacks/meteord:devbuild

RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-key D1CD49BDD30B677273A75C66E4EE62700D8A9E8F && \
  echo "deb http://debathena.mit.edu/apt squeeze debathena debathena-config debathena-system" > /etc/apt/sources.list.d/debathena.list && \
  apt-get update && \
  apt-get install -y python-pip python-dev debathena-moira-clients kstart && \
  pip install credstash

COPY scripts /scripts
ENTRYPOINT bash /scripts/run_jolly_roger.sh
