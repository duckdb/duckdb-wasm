#!/usr/bin/env bash

multipass launch \
    --cpus 4 \
    --disk 100G \
    --mem 6G \
    --name github-actions-runner \
    --cloud-init ./cloud-init.yaml

