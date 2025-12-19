#!/bin/bash
# Script to replace secret keys in git history

if [ -f "PAYMONGO_SETUP.md" ]; then
  sed -i "s/sk_test_MXG8hdwTbR6oguQhcjYvBrC8/sk_test_YOUR_SECRET_KEY_HERE/g" PAYMONGO_SETUP.md
  sed -i "s/pk_test_4M5C3PMLA1L86jqW1gVfB1hZ/pk_test_YOUR_PUBLIC_KEY_HERE/g" PAYMONGO_SETUP.md
fi

if [ -f "RAILWAY_DEPLOYMENT.md" ]; then
  sed -i "s/sk_test_MXG8hdwTbR6oguQhcjYvBrC8/sk_test_YOUR_SECRET_KEY_HERE/g" RAILWAY_DEPLOYMENT.md
  sed -i "s/pk_test_4M5C3PMLA1L86jqW1gVfB1hZ/pk_test_YOUR_PUBLIC_KEY_HERE/g" RAILWAY_DEPLOYMENT.md
fi

if [ -f "docs/env.example" ]; then
  sed -i "s/sk_test_MXG8hdwTbR6oguQhcjYvBrC8/sk_test_YOUR_SECRET_KEY_HERE/g" docs/env.example
  sed -i "s/pk_test_4M5C3PMLA1L86jqW1gVfB1hZ/pk_test_YOUR_PUBLIC_KEY_HERE/g" docs/env.example
fi
