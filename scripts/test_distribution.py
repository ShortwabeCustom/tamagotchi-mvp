import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('distribution',Path(__file__).with_name('local-distribution.py'))
d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)

class DistributionTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)/'package';self.root.mkdir()
        (self.root/'server.js').write_bytes(b'valid runtime')
        (self.root/'distribution-manifest.json').write_text(json.dumps({'files':d.inspect(self.root,{b'disposable-sensitive-marker'})}))
    def tearDown(self): self.temp.cleanup()
    def test_valid_binary_and_manifest(self):
        self.assertEqual(len(d.verify(self.root,{b'disposable-sensitive-marker'})['files']),2)
    def test_nested_env_and_cache_rejected(self):
        for name in ['node_modules/a/.env.local','.next/cache/turbopack/file.sst']:
            with self.subTest(name=name):
                self.assertTrue(d.forbidden(name))
                p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b'x')
                with self.assertRaises(ValueError):d.verify(self.root,{b'disposable-sensitive-marker'})
                p.unlink()
    def test_binary_marker_rejected_without_echo(self):
        marker=b'disposable-sensitive-marker';p=self.root/'node_modules/a/native.node';p.parent.mkdir(parents=True);p.write_bytes(b'\x00\xff'+marker+b'\x00')
        with self.assertRaises(ValueError) as caught:d.verify(self.root,{marker})
        self.assertNotIn(marker.decode(),str(caught.exception))
    def test_symlink_external_rejected(self):
        (self.root/'node_modules').symlink_to(Path(self.temp.name),target_is_directory=True)
        with self.assertRaises(ValueError):d.verify(self.root,{b'marker'})
    def test_manifest_tampering_rejected(self):
        (self.root/'server.js').write_bytes(b'modified')
        with self.assertRaises(ValueError):d.verify(self.root,{b'marker'})
    def test_archive_traversal_and_links_rejected(self):
        for link in [False,True]:
            archive=Path(self.temp.name)/'unsafe.tar.gz'
            with tarfile.open(archive,'w:gz') as tar:
                member=tarfile.TarInfo('node_modules/link' if link else '../escape');member.size=0
                if link:member.type=tarfile.SYMTYPE;member.linkname='/etc/passwd'
                tar.addfile(member,io.BytesIO(b''))
            with self.assertRaises(ValueError):d.verify(archive,{b'marker'})
    def test_bound_fails_closed(self):
        previous=d.MAX_FILE;d.MAX_FILE=4
        try:
            with self.assertRaises(ValueError):d.verify(self.root,{b'marker'})
        finally:d.MAX_FILE=previous

if __name__=='__main__':unittest.main()
