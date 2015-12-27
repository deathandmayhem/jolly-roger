FROM meteorhacks/meteord:onbuild

CMD apt-get install -y python-pip
CMD pip install credstash

COPY scripts /scripts
ENTRYPOINT bash /scripts/run_jolly_roger.sh
