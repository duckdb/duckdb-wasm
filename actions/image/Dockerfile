FROM ubuntu:23.10

RUN apt-get update -qq \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y \
        tini build-essential git \
        ccache cmake ninja-build llvm clang clang-format clang-tidy curl python3 \
        bison flex \
        brotli rsync \
        libpthread-stubs0-dev \
        libboost-all-dev \
        chromium-browser \
        wget gnupg ca-certificates procps libxss1 \
        zip sqlite3 \
        software-properties-common \
    && add-apt-repository ppa:mozillateam/ppa \
    && mkdir -p /etc/apt/preferences.d/ \
    && apt-get update -qq \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /etc/apt/sources.list.d/google.list

ARG EMSDK_VERSION="3.1.24"
RUN mkdir -p /opt/emsdk \
    && cd /opt/emsdk \
    && curl -SL https://github.com/emscripten-core/emsdk/archive/${EMSDK_VERSION}.tar.gz | tar -xz --strip-components=1 \
    && ./emsdk install ${EMSDK_VERSION} \
    && ./emsdk activate ${EMSDK_VERSION} \
    && /bin/bash ./emsdk_env.sh \
    && rm -rf ./emscripten/tag-*/tests \
    && rm -rf ./emscripten/tag-*/site \
    && rm -rf ./emscripten/tag-*/docs \
    && rm -rf ./zips \
    && find . -name "*.o" -exec rm {} \; \
    && find . -name "*.a" -exec rm {} \; \
    && find . -name "*.tmp" -exec rm {} \;

SHELL ["/bin/bash", "-c"]

ARG UNAME=actions
ARG UID=1000
ARG GID=1000
# Create user:group, continue normally if already present
RUN (id -g ${GID} &> /dev/null && id || groupadd -g ${GID} -o ${UNAME}) \
    && (id -u ${UID} || useradd -m -g ${GID} -u ${UID} -s /bin/bash ${UNAME})

ENV NVM_DIR=/opt/nvm
ARG NVM_VERSION="v0.39.2"
ARG NODE_VERSION="v18.12.0"
RUN mkdir -p /opt/nvm \
    && ls -lisah /opt/nvm \
    && curl https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash \
    && source ${NVM_DIR}/nvm.sh \
    && nvm install ${NODE_VERSION} \
    && nvm alias default ${NODE_VERSION} \
    && nvm use default \
    && npm install --global yarn \
    && chown -R ${UID}:${GID} /opt/nvm

ARG RUST_VERSION="1.64.0"
RUN export RUSTUP_HOME=/opt/rust \
    && export CARGO_HOME=/opt/rust \
    && curl https://sh.rustup.rs -sSf | sh -s -- --default-toolchain ${RUST_VERSION} -y \
    && export PATH=$PATH:/opt/rust/bin \
    && rustup target add wasm32-unknown-unknown \
    && chown -R ${UID}:${GID} /opt/rust

RUN source /opt/emsdk/emsdk_env.sh \
    && echo "export PATH=$PATH:/opt/rust/bin" >> /opt/env.sh \
    && echo "export EMSDK=$EMSDK" >> /opt/env.sh \
    && echo "export EMSDK_NODE=$EMSDK_NODE" >> /opt/env.sh \
    && echo "export EM_CONFIG=/opt/emsdk/.emscripten" >> /opt/env.sh \
    && echo "export CARGO_HOME=/opt/rust" >> /opt/env.sh \
    && echo "export RUSTUP_HOME=/opt/rust" >> /opt/env.sh \
    && echo "export BOOST_ARCHIVE=/opt/boost.tar.gz" >> /opt/env.sh \
    && echo "source /opt/nvm/nvm.sh" >> /opt/env.sh \
    && cat /opt/env.sh \
    && printf '#!/bin/bash\nsource /opt/env.sh\nexec env "$@"\n' > /opt/entrypoint.sh \
    && chmod +x /opt/entrypoint.sh \
    && chown -R ${UID}:${GID} /opt/entrypoint.sh

USER ${UID}:${GID}

ENTRYPOINT ["tini", "-v", "--", "/opt/entrypoint.sh"]
WORKDIR /wd
