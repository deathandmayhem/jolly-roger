FROM meteorhacks/meteord:onbuild

RUN apt-get install -y python-pip
RUN pip install credstash

COPY scripts /scripts
ENTRYPOINT bash /scripts/run_jolly_roger.sh
