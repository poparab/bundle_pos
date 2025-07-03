from setuptools import setup, find_packages

with open("requirements.txt") as f:
    install_requires = f.read().strip().split("\n")

# get version from __version__ variable in bundle_pos/__init__.py
from bundle_pos import __version__ as version

setup(
    name="bundle_pos",
    version=version,
    description="Dynamic Bundle Point of Sale System for ERPNext",
    author="Your Company",
    author_email="your-email@example.com",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=install_requires
) 